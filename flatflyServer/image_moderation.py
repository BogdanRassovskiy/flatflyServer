from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Dict, List, Optional, Union

from django.contrib.auth import get_user_model

from chats.models import Chat, Message, ModerationMessage, RejectedImageModerationLog, ImageModerationRule
from users.models import Profile


User = get_user_model()


@dataclass
class ImageModerationResult:
    violation: bool
    reasons: List[str]
    details: str
    provider: str
    raw_scores: Dict[str, Union[int, float]]
    raw_labels: List[str]
    skipped: bool = False


def _env_float(name: str, default: float) -> float:
    try:
        raw = os.getenv(name, "").strip()
        return float(raw) if raw else float(default)
    except Exception:
        return float(default)


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return bool(default)
    return raw in {"1", "true", "yes", "on"}


def _moderate_image_sightengine(content: bytes) -> ImageModerationResult:
    api_user = os.getenv("SIGHTENGINE_API_USER", "1749246534").strip()
    api_secret = os.getenv("SIGHTENGINE_API_SECRET", "Km5ZHwDEcRGj8V4dixGw4H4ymV6PBsg8").strip()
    if not api_user or not api_secret:
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details="sightengine_not_configured",
            provider="sightengine",
            raw_scores={},
            raw_labels=[],
            skipped=True,
        )

    try:
        import requests
    except Exception:
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details="requests_not_available",
            provider="sightengine",
            raw_scores={},
            raw_labels=[],
            skipped=True,
        )

    url = os.getenv("SIGHTENGINE_ENDPOINT", "https://api.sightengine.com/1.0/check.json").strip()
    models = os.getenv("SIGHTENGINE_MODELS", "nudity-2.0,offensive-2.0,wad,gore").strip() or "nudity-2.0,offensive-2.0,wad,gore"

    try:
        resp = requests.post(
            url,
            data={
                "models": models,
                "api_user": api_user,
                "api_secret": api_secret,
            },
            files={
                "media": ("upload.jpg", content, "image/jpeg"),
            },
            timeout=20,
        )
        data = resp.json()
    except Exception as e:
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details=f"sightengine_request_failed:{type(e).__name__}",
            provider="sightengine",
            raw_scores={},
            raw_labels=[],
            skipped=True,
        )

    if not isinstance(data, dict) or data.get("status") != "success":
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details=f"sightengine_bad_response:{(data or {}).get('status')}",
            provider="sightengine",
            raw_scores={"http_status": float(getattr(resp, "status_code", 0) or 0)},
            raw_labels=[],
            skipped=True,
        )

    nudity = data.get("nudity") or {}
    offensive = data.get("offensive") or {}
    raw_scores: Dict[str, Union[int, float]] = {}
    for key in ("safe", "partial", "raw", "sexual_activity", "sexual_display", "erotica", "suggestive", "none", "sextoy"):
        if key in nudity:
            try:
                raw_scores[f"nudity_{key}"] = float(nudity.get(key) or 0.0)
            except Exception:
                pass
    for key in ("alcohol", "drugs", "recreational_drugs", "medical_drugs", "weapon", "weapon_knife", "weapon_firearm"):
        if key in data:
            try:
                raw_scores[key] = float(data.get(key) or 0.0)
            except Exception:
                pass
    gore = data.get("gore") or {}
    skull = data.get("skull") or {}
    if isinstance(gore, dict) and "prob" in gore:
        try:
            raw_scores["gore_prob"] = float(gore.get("prob") or 0.0)
        except Exception:
            pass
    if isinstance(skull, dict) and "prob" in skull:
        try:
            raw_scores["skull_prob"] = float(skull.get("prob") or 0.0)
        except Exception:
            pass
    if isinstance(offensive, dict):
        for key in (
            "nazi",
            "terrorist",
            "supremacist",
            "offensive",
            "confederate",
            "asian_swastika",
        ):
            if key in offensive:
                try:
                    raw_scores[f"offensive_{key}"] = float(offensive.get(key) or 0.0)
                except Exception:
                    pass

    # If admin configured rules for sightengine, use them
    rules = list(
        ImageModerationRule.objects.filter(
            is_active=True,
            provider=ImageModerationRule.PROVIDER_SIGHTENGINE,
        ).order_by("id")
    )
    if rules:
        for rule in rules:
            metric = str(rule.metric or "").strip()
            try:
                value = float(raw_scores.get(metric) or 0.0)
            except Exception:
                value = 0.0
            if value >= float(rule.threshold):
                reasons: List[str] = []
                if isinstance(rule.reasons, list) and rule.reasons:
                    reasons = [str(r) for r in rule.reasons if str(r).strip()]
                if not reasons:
                    reasons = ["policy_violation"]
                return ImageModerationResult(
                    violation=True,
                    reasons=reasons,
                    details=f"sightengine:{metric}={value:.4f}>= {float(rule.threshold):.4f}",
                    provider="sightengine",
                    raw_scores=raw_scores,
                    raw_labels=[],
                    skipped=False,
                )

        return ImageModerationResult(
            violation=False,
            reasons=[],
            details="sightengine_ok_rules",
            provider="sightengine",
            raw_scores=raw_scores,
            raw_labels=[],
            skipped=False,
        )

    # Defaults
    nudity_raw_th = _env_float("SIGHTENGINE_NUDITY_RAW_THRESHOLD", 0.30)
    nudity_partial_th = _env_float("SIGHTENGINE_NUDITY_PARTIAL_THRESHOLD", 0.40)
    nudity_sexual_activity_th = _env_float("SIGHTENGINE_NUDITY_SEXUAL_ACTIVITY_THRESHOLD", 0.20)
    nudity_sexual_display_th = _env_float("SIGHTENGINE_NUDITY_SEXUAL_DISPLAY_THRESHOLD", 0.30)
    nudity_erotica_th = _env_float("SIGHTENGINE_NUDITY_EROTICA_THRESHOLD", 0.35)
    nudity_suggestive_th = _env_float("SIGHTENGINE_NUDITY_SUGGESTIVE_THRESHOLD", 0.60)
    offensive_nazi_th = _env_float("SIGHTENGINE_OFFENSIVE_NAZI_THRESHOLD", 0.05)
    offensive_terrorist_th = _env_float("SIGHTENGINE_OFFENSIVE_TERRORIST_THRESHOLD", 0.05)
    offensive_supremacist_th = _env_float("SIGHTENGINE_OFFENSIVE_SUPREMACIST_THRESHOLD", 0.05)
    offensive_generic_th = _env_float("SIGHTENGINE_OFFENSIVE_GENERIC_THRESHOLD", 0.60)
    weapon_th = _env_float("SIGHTENGINE_WEAPON_THRESHOLD", 0.35)
    gore_th = _env_float("SIGHTENGINE_GORE_THRESHOLD", 0.25)
    drugs_th = _env_float("SIGHTENGINE_DRUGS_THRESHOLD", 0.40)
    nudity_raw = float(raw_scores.get("nudity_raw") or 0.0)
    nudity_partial = float(raw_scores.get("nudity_partial") or 0.0)
    nudity_sexual_activity = float(raw_scores.get("nudity_sexual_activity") or 0.0)
    nudity_sexual_display = float(raw_scores.get("nudity_sexual_display") or 0.0)
    nudity_erotica = float(raw_scores.get("nudity_erotica") or 0.0)
    nudity_suggestive = float(raw_scores.get("nudity_suggestive") or 0.0)
    off_nazi = float(raw_scores.get("offensive_nazi") or 0.0)
    off_terrorist = float(raw_scores.get("offensive_terrorist") or 0.0)
    off_supremacist = float(raw_scores.get("offensive_supremacist") or 0.0)
    off_generic = float(raw_scores.get("offensive_offensive") or 0.0)
    weapon = float(raw_scores.get("weapon") or 0.0)
    weapon_knife = float(raw_scores.get("weapon_knife") or 0.0)
    weapon_firearm = float(raw_scores.get("weapon_firearm") or 0.0)
    gore_prob = float(raw_scores.get("gore_prob") or 0.0)
    drugs = float(raw_scores.get("drugs") or 0.0)
    recreational_drugs = float(raw_scores.get("recreational_drugs") or 0.0)
    medical_drugs = float(raw_scores.get("medical_drugs") or 0.0)

    reasons: List[str] = []
    if (
        nudity_raw >= nudity_raw_th
        or nudity_partial >= nudity_partial_th
        or nudity_sexual_activity >= nudity_sexual_activity_th
        or nudity_sexual_display >= nudity_sexual_display_th
        or nudity_erotica >= nudity_erotica_th
        or nudity_suggestive >= nudity_suggestive_th
    ):
        reasons.append("pornography_or_nudity")
    if off_nazi >= offensive_nazi_th or off_terrorist >= offensive_terrorist_th or off_supremacist >= offensive_supremacist_th:
        reasons.append("hate_symbol_or_extremist_or_graphic_content")
    if off_generic >= offensive_generic_th:
        reasons.append("inappropriate_offensive_content")
    if weapon >= weapon_th or weapon_knife >= weapon_th or weapon_firearm >= weapon_th or gore_prob >= gore_th:
        reasons.append("violence_or_weapons")
    if drugs >= drugs_th or recreational_drugs >= drugs_th or medical_drugs >= drugs_th:
        reasons.append("drug_related_content")

    reasons = list(dict.fromkeys(reasons))

    return ImageModerationResult(
        violation=len(reasons) > 0,
        reasons=reasons,
        details=(
            f"sightengine_nudity_raw={nudity_raw:.4f},partial={nudity_partial:.4f},"
            f"sexual_activity={nudity_sexual_activity:.4f},sexual_display={nudity_sexual_display:.4f},"
            f"erotica={nudity_erotica:.4f},suggestive={nudity_suggestive:.4f},"
            f"nazi={off_nazi:.4f},terrorist={off_terrorist:.4f},supremacist={off_supremacist:.4f},offensive={off_generic:.4f},"
            f"weapon={weapon:.4f},weapon_knife={weapon_knife:.4f},weapon_firearm={weapon_firearm:.4f},gore={gore_prob:.4f},"
            f"drugs={drugs:.4f},recreational={recreational_drugs:.4f},medical_drugs={medical_drugs:.4f}"
        ),
        provider="sightengine",
        raw_scores=raw_scores,
        raw_labels=[],
        skipped=False,
    )


def _moderate_image_local(content: bytes) -> ImageModerationResult:
    try:
        from PIL import Image
        import io
        import opennsfw2 as n2
    except Exception:
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details="local_model_not_available",
            provider="local_opennsfw2",
            raw_scores={},
            raw_labels=[],
            skipped=True,
        )

    try:
        img = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception:
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details="local_image_decode_failed",
            provider="local_opennsfw2",
            raw_scores={},
            raw_labels=[],
            skipped=True,
        )

    try:
        nsfw_prob = float(n2.predict_image(img))
    except Exception:
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details="local_model_inference_failed",
            provider="local_opennsfw2",
            raw_scores={},
            raw_labels=[],
            skipped=True,
        )

    nsfw_threshold = _env_float("LOCAL_NSFW_THRESHOLD", 0.65)
    rules = list(
        ImageModerationRule.objects.filter(
            is_active=True,
            provider=ImageModerationRule.PROVIDER_LOCAL_OPENNSFW2,
            metric=ImageModerationRule.METRIC_NSFW_PROBABILITY,
        ).order_by("-threshold", "id")
    )
    if not rules:
        rules = [
            ImageModerationRule(
                name="Default NSFW rule",
                is_active=True,
                provider=ImageModerationRule.PROVIDER_LOCAL_OPENNSFW2,
                metric=ImageModerationRule.METRIC_NSFW_PROBABILITY,
                threshold=nsfw_threshold,
                reasons=["pornography_or_nudity"],
            )
        ]

    reasons: List[str] = []
    for rule in rules:
        if nsfw_prob >= float(rule.threshold):
            if isinstance(rule.reasons, list) and rule.reasons:
                reasons.extend([str(r) for r in rule.reasons if str(r).strip()])
            else:
                reasons.append("pornography_or_nudity")
            break

    return ImageModerationResult(
        violation=len(reasons) > 0,
        reasons=reasons,
        details=f"nsfw_probability={nsfw_prob:.4f}",
        provider="local_opennsfw2",
        raw_scores={"nsfw_probability": nsfw_prob},
        raw_labels=[],
        skipped=False,
    )


def moderate_image(uploaded_file) -> ImageModerationResult:
    """
    Image moderation via Sightengine (primary) + local OpenNSFW2 fallback.
    """
    try:
        content = uploaded_file.read()
        uploaded_file.seek(0)
    except Exception:
        return ImageModerationResult(
            violation=False,
            reasons=[],
            details="file_read_error",
            provider="unknown",
            raw_scores={},
            raw_labels=[],
            skipped=True,
        )

    se_result = _moderate_image_sightengine(content)
    if not se_result.skipped:
        result = se_result
    else:
        result = _moderate_image_local(content)
    strict = _env_bool("IMAGE_MODERATION_STRICT", True)
    if strict and result.skipped:
        return ImageModerationResult(
            violation=True,
            reasons=["moderation_unavailable"],
            details=f"strict_block:{result.details}",
            provider=result.provider,
            raw_scores=result.raw_scores,
            raw_labels=result.raw_labels,
            skipped=True,
        )
    return result


def apply_moderation_strike_and_notify(
    user: User,
    reasons: List[str],
    source: str,
    raw_scores: Optional[Dict[str, Union[int, float]]] = None,
    raw_labels: Optional[List[str]] = None,
    provider: str = "local_opennsfw2",
    listing=None,
) -> dict:
    RejectedImageModerationLog.objects.create(
        user=user,
        source=RejectedImageModerationLog.SOURCE_LISTING if "listing" in source else RejectedImageModerationLog.SOURCE_AVATAR,
        listing=listing,
        reasons=reasons or [],
        raw_scores=raw_scores or {},
        raw_labels=raw_labels or [],
        provider=str(provider or "unknown"),
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
