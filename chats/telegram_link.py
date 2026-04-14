import base64
import hashlib
import hmac
import json
import os
import struct
import time
from pathlib import Path
from typing import Optional

from django.conf import settings


TOKEN_VERSION = 1


def _state_file_path() -> Path:
    raw = os.getenv("TG_BOT_STATE_PATH")
    if raw:
        p = Path(raw)
        if not p.is_absolute():
            p = Path(settings.BASE_DIR) / p
        return p
    return Path(settings.BASE_DIR) / "telegram_chatbot_state.json"


def _link_secret_bytes() -> bytes:
    secret = (
        os.getenv("LINK_SECRET")
        or getattr(settings, "TELEGRAM_LINK_SECRET", "")
        or os.getenv("SECRET_KEY")
        or ""
    )
    return str(secret).encode("utf-8")


def can_sign_telegram_links() -> bool:
    return len(_link_secret_bytes()) >= 16


def sign_link_token(site_user_id: int, lang_code: str, ttl_seconds: int = 7 * 24 * 3600) -> str:
    exp = int(time.time()) + int(ttl_seconds)
    lang = (lang_code or "ru")[:2].lower().ljust(2, "x")[:2]
    body = struct.pack(
        "!BII2s",
        TOKEN_VERSION,
        int(site_user_id) & 0xFFFFFFFF,
        exp & 0xFFFFFFFF,
        lang.encode("ascii", errors="replace")[:2],
    )
    sig = hmac.new(_link_secret_bytes(), body, hashlib.sha256).digest()[:12]
    raw = body + sig
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _read_state() -> dict:
    path = _state_file_path()
    if not path.exists():
        return {"users": {}}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"users": {}}


def _write_state(data: dict) -> None:
    path = _state_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def find_telegram_link(site_user_id: int) -> Optional[int]:
    state = _read_state()
    users = state.get("users") or {}
    for tg_user_id, payload in users.items():
        try:
            if int((payload or {}).get("site_user_id")) == int(site_user_id):
                return int(tg_user_id)
        except Exception:
            continue
    return None


def unlink_telegram(site_user_id: int) -> int:
    state = _read_state()
    users = state.get("users") or {}
    to_delete: list[str] = []
    for tg_user_id, payload in users.items():
        try:
            if int((payload or {}).get("site_user_id")) == int(site_user_id):
                to_delete.append(str(tg_user_id))
        except Exception:
            continue
    for key in to_delete:
        users.pop(key, None)
    state["users"] = users
    _write_state(state)
    return len(to_delete)

