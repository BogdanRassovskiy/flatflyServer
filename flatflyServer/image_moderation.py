from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from django.contrib.auth import get_user_model

from chats.models import Chat, Message, ModerationMessage, RejectedImageModerationLog
from users.models import Profile


User = get_user_model()


@dataclass
class ImageModerationResult:
    violation: bool
    reasons: List[str]
    details: str
    raw_scores: Dict[str, int]
    raw_labels: List[str]
    skipped: bool = False


def _safe_search_likelihood_to_int(value) -> int:
    try:
        return int(value)
    except Exception:
        return 0


def moderate_image(uploaded_file) -> ImageModerationResult:
    """
    Image moderation via Google Vision SafeSearch + labels.
    If provider is unavailable, moderation is skipped (upload allowed).
    """
    try:
        from google.cloud import vision
    except Exception:
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details="google_vision_not_installed",
            raw_scores={},
            raw_labels=[],
            skipped=True,
        )

    try:
        content = uploaded_file.read()
        uploaded_file.seek(0)
    except Exception:
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details="file_read_error",
            raw_scores={},
            raw_labels=[],
            skipped=True,
        )

    try:
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=content)

        safe_resp = client.safe_search_detection(image=image)
        label_resp = client.label_detection(image=image, max_results=15)

        safe = safe_resp.safe_search_annotation
        labels = [str(label.description or "").lower() for label in (label_resp.label_annotations or [])]
    except Exception:
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details="google_vision_request_failed",
            raw_scores={},
            raw_labels=[],
            skipped=True,
        )

    reasons: List[str] = []
    # 4=LIKELY, 5=VERY_LIKELY
    if _safe_search_likelihood_to_int(safe.adult) >= 4:
        reasons.append("pornography_or_nudity")
    if _safe_search_likelihood_to_int(safe.violence) >= 4:
        reasons.append("violence")
    if _safe_search_likelihood_to_int(safe.racy) >= 5:
        reasons.append("sexually_suggestive_content")

    prohibited_label_keywords = [
        "swastika",
        "hate symbol",
        "nazi",
        "white supremacy",
        "extremist",
        "weapon",
        "gun",
        "blood",
        "gore",
    ]
    if any(any(keyword in label for keyword in prohibited_label_keywords) for label in labels):
        reasons.append("hate_symbol_or_extremist_or_graphic_content")

    raw_scores = {
        "adult": _safe_search_likelihood_to_int(safe.adult),
        "violence": _safe_search_likelihood_to_int(safe.violence),
        "racy": _safe_search_likelihood_to_int(safe.racy),
        "medical": _safe_search_likelihood_to_int(safe.medical),
        "spoof": _safe_search_likelihood_to_int(safe.spoof),
    }

    return ImageModerationResult(
        violation=len(reasons) > 0,
        reasons=reasons,
        details=f"labels={labels[:8]}",
        raw_scores=raw_scores,
        raw_labels=labels[:20],
        skipped=False,
    )


def apply_moderation_strike_and_notify(
    user: User,
    reasons: List[str],
    source: str,
    raw_scores: Optional[Dict[str, int]] = None,
    raw_labels: Optional[List[str]] = None,
    listing=None,
) -> dict:
    RejectedImageModerationLog.objects.create(
        user=user,
        source=RejectedImageModerationLog.SOURCE_LISTING if "listing" in source else RejectedImageModerationLog.SOURCE_AVATAR,
        listing=listing,
        reasons=reasons or [],
        raw_scores=raw_scores or {},
        raw_labels=raw_labels or [],
        provider="google_vision",
    )

    profile, _ = Profile.objects.get_or_create(user=user)
    profile.moderation_strikes = int(profile.moderation_strikes or 0) + 1
    profile.save(update_fields=["moderation_strikes"])

    banned = False
    if profile.moderation_strikes >= 3 and user.is_active:
        user.is_active = False
        user.save(update_fields=["is_active"])
        banned = True

    support_user, _ = User.objects.get_or_create(
        username="support",
        defaults={
            "email": "support@flatfly.local",
            "is_staff": True,
            "is_active": True,
        },
    )
    chat = (
        Chat.objects
        .filter(participants=support_user)
        .filter(participants=user)
        .first()
    )
    if not chat:
        chat = Chat.objects.create()
        chat.participants.add(support_user, user)

    reasons_text = ", ".join(reasons) if reasons else "policy_violation"
    text = (
        "Ваше изображение отклонено автоматической модерацией. "
        f"Причина: {reasons_text}. Источник: {source}. "
        "Зафиксирован 1 страйк. При 3 страйках аккаунт блокируется."
    )
    msg = Message.objects.create(chat=chat, sender=support_user, text=text)
    ModerationMessage.objects.create(
        target_user=user,
        message=text,
        created_by=support_user,
        linked_chat=chat,
        linked_message=msg,
    )

    return {
        "strikes": profile.moderation_strikes,
        "banned": banned,
    }
