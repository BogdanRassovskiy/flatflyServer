from __future__ import annotations

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile

from users.models import Profile

User = get_user_model()

SUPPORT_USERNAME = "support"
SUPPORT_EMAIL = "support@flatfly.local"

_SUPPORT_LOGO_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#BA00F8"/>
      <stop offset="100%" stop-color="#08D3E2"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="256" height="256" rx="64" fill="#120A2A"/>
  <rect x="16" y="16" width="224" height="224" rx="56" fill="url(#g)" opacity="0.2"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle"
        font-family="Inter, Arial, sans-serif" font-size="98" font-weight="800" fill="#ffffff">F</text>
</svg>
"""


def get_profile_locale(user) -> str:
    profile = getattr(user, "profile", None)
    if profile:
        raw = str(getattr(profile, "languages", "") or "").lower()
        tokens = [token.strip() for token in raw.replace(";", ",").split(",") if token.strip()]
        for token in tokens:
            if token in {"cz", "cs", "czech", "čeština", "cesky"}:
                return "cs"
            if token in {"ru", "russian", "русский"}:
                return "ru"
            if token in {"en", "english"}:
                return "en"
    return "en"


def get_or_create_flatfly_support_user():
    support_user, _ = User.objects.get_or_create(
        username=SUPPORT_USERNAME,
        defaults={
            "email": SUPPORT_EMAIL,
            "first_name": "FlatFly",
            "last_name": "",
            "is_staff": True,
            "is_active": True,
        },
    )
    changed = False
    if support_user.email != SUPPORT_EMAIL:
        support_user.email = SUPPORT_EMAIL
        changed = True
    if support_user.first_name != "FlatFly":
        support_user.first_name = "FlatFly"
        changed = True
    if changed:
        support_user.save(update_fields=["email", "first_name"])

    profile, _ = Profile.objects.get_or_create(user=support_user)
    profile_changed = False
    if (profile.name or "") != "FlatFly":
        profile.name = "FlatFly"
        profile_changed = True
    if not profile.avatar:
        profile.avatar.save("flatfly-support.svg", ContentFile(_SUPPORT_LOGO_SVG.encode("utf-8")), save=False)
        profile_changed = True
    if profile_changed:
        update_fields = ["name"]
        if profile.avatar:
            update_fields.append("avatar")
        profile.save(update_fields=update_fields)

    return support_user

