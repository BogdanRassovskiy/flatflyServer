#!/usr/bin/env python3
"""
Telegram-бот для уведомлений и ответов в чатах FlatFly через существующее HTTP API.

Зависимости:
  pip install aiogram>=3.4 aiohttp

Переменные окружения:
  BOT_TOKEN           — токен Telegram-бота (обязательно)
  LINK_SECRET         — общий секрет для подписи deep link (обязательно, >= 16 байт в UTF-8)
  FLATFLY_API_BASE    — базовый URL сайта, например https://example.com (обязательно)

  TG_BOT_STATE_PATH   — путь к JSON с привязками и куками (по умолчанию ./telegram_chatbot_state.json)
  POLL_INTERVAL_SEC   — интервал опроса новых сообщений для уведомлений (по умолчанию 25)

  Режим webhook (если задан WEBHOOK_URL — запускается aiohttp-сервер вместо polling):
  WEBHOOK_URL         — полный публичный URL вебхука, напр. https://host:8443/tg/webhook
  WEBHOOK_HOST        — 0.0.0.0
  WEBHOOK_PORT        — 8080
  WEBHOOK_PATH        — путь, совпадающий с путём в WEBHOOK_URL (по умолчанию /tg/webhook)

  Опционально (только для отладки / без доработки бэкенда):
  ALLOW_DEV_SESSION=1 — разрешить команду /dev_session для вставки sessionid и csrftoken вручную

Генерация ссылки с сайта (тот же LINK_SECRET):
  python telegram_flatfly_chatbot.py --sign-link 12345 ru
  Вернётся токен для https://t.me/<bot_username>?start=<token>

Формат токена /start (компактный, до 64 символов для Telegram):
  base64url( version(1) | user_id_be32 | exp_be32 | lang_ascii_2 | hmac12 )
  hmac12 = первые 12 байт HMAC-SHA256(LINK_SECRET, полезная нагрузка без подписи)

После перехода по ссылке бот сохраняет связь telegram_user_id <-> user_id сайта.
Любой GET /api/chats/<id>/messages/ на бэкенде помечает входящие как прочитанные; в боте
показываются последние входящие из ответа API (не «только непрочитанные» без доработки API).

Для реальных запросов к API нужны Django session cookies (sessionid, csrftoken).
Пока на бэкенде нет выдачи сессии боту, их можно один раз задать через /dev_session
(при ALLOW_DEV_SESSION=1) или дописать в JSON состояния поле "cookies" у пользователя.

Запуск:
  python telegram_flatfly_chatbot.py              # polling
  WEBHOOK_URL=https://... python telegram_flatfly_chatbot.py
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
from pathlib import Path
import struct
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Optional
import aiohttp
from aiohttp import web
from yarl import URL
from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

# Подгружаем .env, чтобы бот видел те же переменные,
# что и Django-приложение (в т.ч. при запуске через restart.sh / nohup).
try:
    from dotenv import load_dotenv

    BASE_DIR = Path(__file__).resolve().parent
    load_dotenv(BASE_DIR / ".env")
    load_dotenv(BASE_DIR / ".env.local")
except Exception:
    pass

# ---------------------------------------------------------------------------
# Конфигурация
# ---------------------------------------------------------------------------

def _env(name: str, default: Optional[str] = None) -> Optional[str]:
    v = os.environ.get(name)
    return v if v is not None and v != "" else default


def _require_env(name: str) -> str:
    v = _env(name)
    if not v:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return v


BOT_TOKEN = _env("TELEGRAM_CHAT_BOT_TOKEN", "") or _env("BOT_TOKEN", "") or _env("TELEGRAM_BOT_TOKEN", "")
LINK_SECRET_RAW = _env("LINK_SECRET", "") or _env("TELEGRAM_LINK_SECRET", "")
FLATFLY_API_BASE = (_env("FLATFLY_API_BASE", "") or "http://127.0.0.1:8000").rstrip("/")
STATE_PATH = _env("TG_BOT_STATE_PATH", "telegram_chatbot_state.json")
POLL_INTERVAL_SEC = float(_env("POLL_INTERVAL_SEC", "25") or "25")
WEBHOOK_URL = (_env("WEBHOOK_URL", "") or "").strip()
WEBHOOK_HOST = _env("WEBHOOK_HOST", "0.0.0.0") or "0.0.0.0"
WEBHOOK_PORT = int(_env("WEBHOOK_PORT", "8080") or "8080")
WEBHOOK_PATH = _env("WEBHOOK_PATH", "/tg/webhook") or "/tg/webhook"
ALLOW_DEV_SESSION = _env("ALLOW_DEV_SESSION", "") in ("1", "true", "yes", "on")

LOG_LEVEL = _env("LOG_LEVEL", "INFO") or "INFO"
logging.basicConfig(level=getattr(logging, LOG_LEVEL.upper(), logging.INFO))
log = logging.getLogger("flatfly_tg_bot")

# ---------------------------------------------------------------------------
# Токен deep link (HMAC, <= 64 символов после кодирования)
# ---------------------------------------------------------------------------

TOKEN_VERSION = 1


def _link_secret_bytes() -> bytes:
    return LINK_SECRET_RAW.encode("utf-8")


def sign_link_token(user_id: int, lang_code: str, ttl_seconds: int = 7 * 24 * 3600) -> str:
    """Сгенерировать токен для ?start=... (используйте на сайте с тем же LINK_SECRET)."""
    exp = int(time.time()) + int(ttl_seconds)
    lang = (lang_code or "cz")[:2].lower().ljust(2, "x")[:2]
    if len(lang) != 2:
        lang = "ru"
    body = struct.pack(
        "!BII2s",
        TOKEN_VERSION,
        int(user_id) & 0xFFFFFFFF,
        exp & 0xFFFFFFFF,
        lang.encode("ascii", errors="replace")[:2],
    )
    sig = hmac.new(_link_secret_bytes(), body, hashlib.sha256).digest()[:12]
    raw = body + sig
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def verify_link_token(token: str) -> Optional[tuple[int, str, int]]:
    """Вернуть (user_id, lang, exp_unix) или None."""
    if not token:
        return None
    pad = "=" * (-len(token) % 4)
    try:
        raw = base64.urlsafe_b64decode(token + pad)
    except Exception:
        return None
    if len(raw) < 11 + 12:
        return None
    body, sig = raw[:-12], raw[-12:]
    if body[0] != TOKEN_VERSION:
        return None
    user_id, exp = struct.unpack("!II", body[1:9])
    lang = body[9:11].decode("ascii", errors="replace")
    expected = hmac.new(_link_secret_bytes(), body, hashlib.sha256).digest()[:12]
    if not hmac.compare_digest(sig, expected):
        return None
    if int(time.time()) > exp:
        return None
    return int(user_id), lang.strip() or "cz", int(exp)


def _sign_link_cli():
    secret = LINK_SECRET_RAW or _require_env("LINK_SECRET")
    _ = secret  # _require_env already validated if empty
    ap = argparse.ArgumentParser(description="Sign FlatFly Telegram deep link token")
    ap.add_argument("user_id", type=int)
    ap.add_argument("lang", type=str, default="ru")
    ap.add_argument("--ttl", type=int, default=7 * 24 * 3600, help="TTL seconds")
    args = ap.parse_args()
    tok = sign_link_token(args.user_id, args.lang, args.ttl)
    print(tok)
    return 0

# ---------------------------------------------------------------------------
# Локализация
# ---------------------------------------------------------------------------

STRINGS: dict[str, dict[str, str]] = {
    "cz": {
        "main_chats": "Chaty",
        "housing_group_title": "Hledáme spolu",
        "main_lang": "Jazyk",
        "main_logout": "Zrušit propojení",
        "choose_lang": "Vyberte jazyk:",
        "back": "Zpět",
        "reply": "Odpovědět",
        "cancel": "Zrušit",
        "logout_confirm": "Opravdu chcete zrušit propojení?",
        "yes": "Ano",
        "no": "Ne",
        "linked_ok": "Účet byl propojen. Použijte menu níže.",
        "link_invalid": "Odkaz je neplatný nebo vypršel. Vygenerujte nový na webu.",
        "no_session": "Propojení je aktivní, ale chybí cookies relace webu.",
        "chats_empty": "Zatím nemáte žádné chaty.",
        "open_chat_error": "Chat se nepodařilo otevřít.",
        "send_error": "Zprávu se nepodařilo odeslat.",
        "sent_ok": "✅ Odesláno",
        "reply_hint": "Napište odpověď. Tlačítko „Zrušit“ ukončí odpovídání.",
        "logged_out": "Propojení zrušeno. Otevřete bota znovu přes odkaz z webu.",
        "notify_new": "Nová zpráva od {name}:",
        "dev_usage": "Použití: /dev_session sessionid=... csrftoken=...",
        "dev_ok": "Cookies uloženy.",
        "start_plain": "Otevřete bota přes odkaz z webu pro propojení účtu.",
    },
    "ru": {
        "main_chats": "Чаты",
        "housing_group_title": "Ищем вместе",
        "main_lang": "Язык",
        "main_logout": "Отменить привязку",
        "choose_lang": "Выберите язык:",
        "back": "Назад",
        "reply": "Ответить",
        "cancel": "Отмена",
        "logout_confirm": "Разорвать связь с аккаунтом на сайте?",
        "yes": "Да",
        "no": "Нет",
        "linked_ok": "Аккаунт привязан. Используйте меню ниже.",
        "link_invalid": "Ссылка недействительна или устарела. Получите новую на сайте.",
        "no_session": "Привязка есть, но нет cookies сессии сайта — запросы к API не пройдут. "
        "Включите ALLOW_DEV_SESSION=1 и выполните /dev_session sessionid=... csrftoken=...",
        "chats_empty": "Чатов пока нет.",
        "open_chat_error": "Не удалось открыть чат.",
        "send_error": "Не удалось отправить сообщение.",
        "sent_ok": "✅ Отправлено",
        "reply_hint": "Напишите ответ текстом. Кнопка «Отмена» — выйти без отправки.",
        "logged_out": "Связь разорвана. Снова откройте бота по ссылке с сайта.",
        "notify_new": "Новое сообщение от {name}:",
        "dev_usage": "Использование: /dev_session sessionid=... csrftoken=...",
        "dev_ok": "Cookies сохранены.",
        "start_plain": "Откройте бота по ссылке с сайта, чтобы привязать аккаунт.",
    },
    "en": {
        "main_chats": "Chats",
        "housing_group_title": "Looking together",
        "main_lang": "Language",
        "main_logout": "Cancel link",
        "choose_lang": "Choose language:",
        "back": "Back",
        "reply": "Reply",
        "cancel": "Cancel",
        "logout_confirm": "Disconnect from your site account?",
        "yes": "Yes",
        "no": "No",
        "linked_ok": "Account linked. Use the menu below.",
        "link_invalid": "Invalid or expired link. Get a new one on the site.",
        "no_session": "Linked, but site session cookies are missing — API calls will fail. "
        "Set ALLOW_DEV_SESSION=1 and run /dev_session sessionid=... csrftoken=...",
        "chats_empty": "No chats yet.",
        "open_chat_error": "Could not open chat.",
        "send_error": "Could not send message.",
        "sent_ok": "✅ Sent",
        "reply_hint": "Type your reply. Tap Cancel to leave without sending.",
        "logged_out": "Disconnected. Open the bot again using the site link.",
        "notify_new": "New message from {name}:",
        "dev_usage": "Usage: /dev_session sessionid=... csrftoken=...",
        "dev_ok": "Cookies saved.",
        "start_plain": "Open the bot using the link on the website to link your account.",
    },
    "uk": {
        "main_chats": "Чати",
        "main_lang": "Мова",
        "main_logout": "Вийти",
        "choose_lang": "Оберіть мову:",
        "back": "Назад",
        "reply": "Відповісти",
        "cancel": "Скасувати",
        "logout_confirm": "Розірвати зв'язок з обліковим записом на сайті?",
        "yes": "Так",
        "no": "Ні",
        "linked_ok": "Обліковий запис прив'язано. Використовуйте меню нижче.",
        "link_invalid": "Посилання недійсне або застаріле. Отримайте нове на сайті.",
        "no_session": "Є прив'язка, але немає cookies сесії сайту — запити до API не пройдуть.",
        "chats_empty": "Чатів поки немає.",
        "open_chat_error": "Не вдалося відкрити чат.",
        "send_error": "Не вдалося надіслати повідомлення.",
        "reply_hint": "Напишіть відповідь текстом. «Скасувати» — вийти без надсилання.",
        "logged_out": "Зв'язок розірвано. Знову відкрийте бота за посиланням з сайту.",
        "notify_new": "Нове повідомлення від {name}:",
        "dev_usage": "Використання: /dev_session sessionid=... csrftoken=...",
        "dev_ok": "Cookies збережено.",
        "start_plain": "Відкрийте бота за посиланням з сайту, щоб прив'язати обліковий запис.",
    },
}


def t(lang: str, key: str, **fmt: Any) -> str:
    bucket = STRINGS.get((lang or "cz")[:2], STRINGS["cz"])
    s = bucket.get(key) or STRINGS["en"].get(key) or key
    return s.format(**fmt) if fmt else s


# ---------------------------------------------------------------------------
# Состояние на диске
# ---------------------------------------------------------------------------

@dataclass
class UserRecord:
    site_user_id: int
    lang: str = "cz"
    cookies: dict[str, str] = field(default_factory=dict)
    # chat_id -> last seen other-user message id for notifications
    last_seen_message_id: dict[str, int] = field(default_factory=dict)
    logout_confirm: bool = False
    # после первого опроса чатов выставляем last_seen по last_message, без рассылки старых «новых»
    notif_initialized: bool = False
    ui_message_id: Optional[int] = None

    def to_json(self) -> dict[str, Any]:
        return {
            "site_user_id": self.site_user_id,
            "lang": self.lang,
            "cookies": self.cookies,
            "last_seen_message_id": self.last_seen_message_id,
            "notif_initialized": self.notif_initialized,
            "ui_message_id": self.ui_message_id,
        }

    @staticmethod
    def from_json(d: dict[str, Any]) -> "UserRecord":
        return UserRecord(
            site_user_id=int(d["site_user_id"]),
            lang=str(d.get("lang") or "cz"),
            cookies=dict(d.get("cookies") or {}),
            last_seen_message_id={str(k): int(v) for k, v in (d.get("last_seen_message_id") or {}).items()},
            notif_initialized=bool(d.get("notif_initialized")),
            ui_message_id=int(d["ui_message_id"]) if d.get("ui_message_id") is not None else None,
        )


class StateStore:
    def __init__(self, path: str):
        self.path = path
        self._lock = asyncio.Lock()
        self.users: dict[str, UserRecord] = {}

    async def load(self) -> None:
        p = os.path.abspath(self.path)
        if not os.path.isfile(p):
            self.users = {}
            return
        def _read() -> dict[str, Any]:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)

        data = await asyncio.to_thread(_read)
        self.users = {}
        for k, v in (data.get("users") or {}).items():
            try:
                self.users[str(k)] = UserRecord.from_json(v)
            except Exception as e:
                log.warning("Skip bad user record %s: %s", k, e)

    async def save(self) -> None:
        async with self._lock:
            payload = {"users": {uid: rec.to_json() for uid, rec in self.users.items()}}

            def _write() -> None:
                tmp = self.path + ".tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                os.replace(tmp, self.path)

            await asyncio.to_thread(_write)

    def get(self, telegram_user_id: int) -> Optional[UserRecord]:
        return self.users.get(str(telegram_user_id))

    async def set_record(self, telegram_user_id: int, record: UserRecord) -> None:
        async with self._lock:
            self.users[str(telegram_user_id)] = record
        await self.save()

    async def update(self, telegram_user_id: int, **kwargs: Any) -> None:
        rec = self.get(telegram_user_id)
        if not rec:
            return
        for k, v in kwargs.items():
            if hasattr(rec, k):
                setattr(rec, k, v)
        await self.set_record(telegram_user_id, rec)

    async def delete(self, telegram_user_id: int) -> None:
        async with self._lock:
            self.users.pop(str(telegram_user_id), None)
        await self.save()


store = StateStore(STATE_PATH)

# ---------------------------------------------------------------------------
# HTTP API FlatFly (session + CSRF)
# ---------------------------------------------------------------------------


def _session_cookie_jar_from_dict(cookies: dict[str, str]) -> aiohttp.CookieJar:
    jar = aiohttp.CookieJar(unsafe=True)
    return jar


class FlatFlyApi:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def _url(self, path: str) -> str:
        if not path.startswith("/"):
            path = "/" + path
        return f"{self.base_url}{path}"

    async def _session(self, cookies: dict[str, str]) -> aiohttp.ClientSession:
        jar = aiohttp.CookieJar(unsafe=True)
        session = aiohttp.ClientSession(cookie_jar=jar)
        # Установить переданные куки на хост API
        host = urlparse(self.base_url).netloc or urlparse(self.base_url).hostname or "localhost"
        for name, value in cookies.items():
            session.cookie_jar.update_cookies({name: value}, response_url=URL(self.base_url + "/"))
        return session

    async def request(
        self,
        cookies: dict[str, str],
        method: str,
        path: str,
        *,
        json_body: Any = None,
        params: Optional[dict[str, Any]] = None,
    ) -> tuple[int, Any]:
        jar = aiohttp.CookieJar(unsafe=True)
        async with aiohttp.ClientSession(cookie_jar=jar) as session:
            for name, value in cookies.items():
                session.cookie_jar.update_cookies({name: value}, response_url=URL(self._url("/")))
            headers: dict[str, str] = {}
            csrf = cookies.get("csrftoken")
            if csrf and method.upper() in ("POST", "PUT", "PATCH", "DELETE"):
                headers["X-CSRFToken"] = csrf
            if json_body is not None:
                headers["Content-Type"] = "application/json"
            async with session.request(
                method.upper(),
                self._url(path),
                json=json_body,
                params=params,
                headers=headers,
            ) as resp:
                text = await resp.text()
                if "application/json" in resp.headers.get("Content-Type", ""):
                    try:
                        data = json.loads(text) if text else None
                    except json.JSONDecodeError:
                        data = text
                else:
                    data = text
                # Подхватить новые Set-Cookie (session rotation)
                new_cookies = dict(cookies)
                for c in session.cookie_jar:
                    if c.key in ("sessionid", "csrftoken"):
                        new_cookies[c.key] = c.value
                return resp.status, (data, new_cookies)


api = FlatFlyApi(FLATFLY_API_BASE or "http://127.0.0.1:8000")


async def api_get_chats(cookies: dict[str, str]) -> tuple[list[dict[str, Any]], dict[str, str]]:
    status, (data, new_c) = await api.request(cookies, "GET", "/api/chats/")
    if status != 200:
        log.debug("GET /api/chats/ -> %s %s", status, data)
        return [], new_c
    if isinstance(data, list):
        return data, new_c
    if isinstance(data, dict) and isinstance(data.get("results"), list):
        return data["results"], new_c
    log.debug("GET /api/chats/ unexpected shape: %s", type(data))
    return [], new_c


async def api_get_messages(
    cookies: dict[str, str], chat_id: int, *, limit: int = 50, offset: int = 0
) -> tuple[Optional[dict[str, Any]], dict[str, str]]:
    status, (data, new_c) = await api.request(
        cookies,
        "GET",
        f"/api/chats/{chat_id}/messages/",
        params={"limit": min(limit, 50), "offset": offset},
    )
    if status != 200 or not isinstance(data, dict):
        log.debug("GET messages -> %s %s", status, data)
        return None, new_c
    return data, new_c


async def api_post_message(cookies: dict[str, str], chat_id: int, text: str) -> tuple[bool, dict[str, str]]:
    status, (_, new_c) = await api.request(
        cookies,
        "POST",
        "/api/messages/",
        json_body={"chat": chat_id, "text": text},
    )
    return status in (200, 201), new_c


async def api_exchange_start_token(token: str) -> Optional[dict[str, str]]:
    if not token:
        return None
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                api._url("/api/chats/telegram-bot/session/"),
                json={"token": token},
                headers={"Content-Type": "application/json"},
            ) as resp:
                if resp.status != 200:
                    log.warning("telegram-bot/session failed: %s", resp.status)
                    return None
                data = await resp.json(content_type=None)
                sessionid = str((data or {}).get("sessionid") or "").strip()
                csrftoken = str((data or {}).get("csrftoken") or "").strip()
                if not sessionid or not csrftoken:
                    return None
                return {"sessionid": sessionid, "csrftoken": csrftoken}
    except Exception as e:
        log.warning("api_exchange_start_token error: %s", e)
        return None


def _other_participant(chat: dict[str, Any], my_site_user_id: int) -> Optional[dict[str, Any]]:
    parts = chat.get("participants") or []
    for p in parts:
        if int(p.get("id", -1)) != my_site_user_id:
            return p
    return None


def _display_name(user: dict[str, Any]) -> str:
    name = (user.get("display_name") or "").strip()
    if name:
        return name
    fn = (user.get("first_name") or "").strip()
    ln = (user.get("last_name") or "").strip()
    full = f"{fn} {ln}".strip()
    if full:
        return full
    return str(user.get("id", "?"))


def _unread_bracket(n: int) -> str:
    if n <= 0:
        return ""
    if n >= 6:
        return " (5+)"
    return f" ({n})"


class ReplyStates(StatesGroup):
    waiting_text = State()


router = Router()


def main_keyboard(lang: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t(lang, "main_chats"))],
            [KeyboardButton(text=t(lang, "main_lang")), KeyboardButton(text=t(lang, "main_logout"))],
        ],
        resize_keyboard=True,
    )


def cancel_only_keyboard(lang: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=t(lang, "cancel"))]],
        resize_keyboard=True,
    )


def lang_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Čeština", callback_data="lang:cz"),
                InlineKeyboardButton(text="Русский", callback_data="lang:ru"),
                InlineKeyboardButton(text="English", callback_data="lang:en"),
            ],
            [InlineKeyboardButton(text="Українська", callback_data="lang:uk")],
        ]
    )


async def upsert_ui_message(
    message: Message,
    telegram_user_id: int,
    rec: UserRecord,
    text: str,
    reply_markup: Optional[InlineKeyboardMarkup] = None,
    *,
    ensure_visible: bool = False,
) -> None:
    # Если пользователь уже отправил более новое сообщение, старый инлайн-блок
    # уехал вверх. Удаляем его и публикуем новый внизу, чтобы меню всегда было видно.
    if ensure_visible and rec.ui_message_id and message.message_id > rec.ui_message_id:
        try:
            await message.bot.delete_message(chat_id=message.chat.id, message_id=rec.ui_message_id)
        except Exception:
            pass
        rec.ui_message_id = None

    if rec.ui_message_id:
        try:
            await message.bot.edit_message_text(
                chat_id=message.chat.id,
                message_id=rec.ui_message_id,
                text=text[:4096],
                reply_markup=reply_markup,
            )
            return
        except Exception:
            rec.ui_message_id = None
    sent = await message.answer(text[:4096], reply_markup=reply_markup)
    rec.ui_message_id = sent.message_id
    await store.set_record(telegram_user_id, rec)


_LABEL_MAIN_CHATS = frozenset(STRINGS[lang]["main_chats"] for lang in STRINGS)
_LABEL_MAIN_LANG = frozenset(STRINGS[lang]["main_lang"] for lang in STRINGS)
_LABEL_MAIN_LOGOUT = frozenset(STRINGS[lang]["main_logout"] for lang in STRINGS)


@router.message(CommandStart())
async def cmd_start(message: Message, command: CommandObject) -> None:
    args = (command.args or "").strip()
    rec_existing = store.get(message.from_user.id)
    lang_hint = rec_existing.lang if rec_existing else "cz"
    if not args:
        await message.answer(t(lang_hint, "start_plain"))
        return
    parsed = verify_link_token(args)
    if not parsed:
        await message.answer(t(lang_hint, "link_invalid"))
        return
    site_uid, lang, _exp = parsed
    existing = store.get(message.from_user.id)
    notif_init = bool(existing.notif_initialized) if existing and existing.site_user_id == site_uid else False
    cookies = await api_exchange_start_token(args)
    if not cookies and existing and existing.site_user_id == site_uid:
        cookies = dict(existing.cookies)
    if not cookies:
        cookies = {}
    rec = UserRecord(
        site_user_id=site_uid,
        lang=lang,
        cookies=cookies,
        notif_initialized=notif_init,
    )
    await store.set_record(message.from_user.id, rec)
    await message.answer(t(rec.lang, "linked_ok"), reply_markup=main_keyboard(rec.lang))


@router.message(F.text.in_(_LABEL_MAIN_CHATS))
async def chats_button(message: Message) -> None:
    rec = store.get(message.from_user.id)
    if not rec:
        return
    if message.text != t(rec.lang, "main_chats"):
        return
    await show_chats_list(message, rec)


async def show_chats_list(message: Message, rec: UserRecord) -> None:
    if not rec.cookies.get("sessionid"):
        await message.answer(t(rec.lang, "no_session"), reply_markup=main_keyboard(rec.lang))
        return
    chats, new_c = await api_get_chats(rec.cookies)
    if new_c != rec.cookies:
        rec.cookies = new_c
        await store.set_record(message.from_user.id, rec)
    if not chats:
        await message.answer(t(rec.lang, "chats_empty"), reply_markup=main_keyboard(rec.lang))
        return
    rows: list[list[InlineKeyboardButton]] = []
    for chat in chats:
        cid = chat.get("chatid")
        if cid is None:
            continue
        if str(chat.get("chat_type") or "") == "housing_group":
            label_base = t(rec.lang, "housing_group_title")
        else:
            other = _other_participant(chat, rec.site_user_id)
            label_base = _display_name(other) if other else f"Chat {cid}"
        unread = int(chat.get("unread_count") or 0)
        label = label_base + _unread_bracket(unread)
        rows.append([InlineKeyboardButton(text=label[:64], callback_data=f"open:{cid}")])
    await upsert_ui_message(
        message,
        message.from_user.id,
        rec,
        t(rec.lang, "main_chats") + ":",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows),
        ensure_visible=True,
    )


@router.callback_query(F.data.startswith("open:"))
async def cb_open_chat(query: CallbackQuery, state: FSMContext) -> None:
    await query.answer()
    rec = store.get(query.from_user.id)
    if not rec:
        return
    chat_id = int(query.data.split(":", 1)[1])
    if not rec.cookies.get("sessionid"):
        await query.message.answer(t(rec.lang, "no_session"))
        return
    data, new_c = await api_get_messages(rec.cookies, chat_id, limit=50, offset=0)
    rec.cookies = new_c
    await store.set_record(query.from_user.id, rec)
    if not data:
        await query.message.answer(t(rec.lang, "open_chat_error"))
        return
    results = data.get("results") or []
    my_id = rec.site_user_id
    # Всегда показываем последние сообщения чата целиком (входящие + исходящие),
    # иначе в некоторых групповых сценариях история визуально "пропадает".
    history_sorted = sorted(results, key=lambda m: (m.get("created_at") or "", m.get("id") or 0))
    lines: list[str] = []
    for m in history_sorted[-15:]:
        sender = m.get("sender") or {}
        who = _display_name(sender)
        text = (m.get("text") or "").strip()
        if not text:
            if str(m.get("message_kind") or "") == "listing":
                preview = m.get("listing_preview") or {}
                text = (
                    str(preview.get("title") or "").strip()
                    or (m.get("display_text") or "").strip()
                    or "📌 Listing"
                )
            else:
                text = (m.get("display_text") or "").strip() or "—"
        lines.append(f"{who}: {text}")
    body = "\n".join(lines) if lines else "—"
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t(rec.lang, "reply"), callback_data=f"reply:{chat_id}"),
                InlineKeyboardButton(text=t(rec.lang, "back"), callback_data="list:chats"),
            ],
        ]
    )
    await upsert_ui_message(query.message, query.from_user.id, rec, body, reply_markup=kb)

    # Уведомления: обновить last seen по последнему сообщению от собеседника
    incoming_other_sorted = sorted(
        [m for m in results if int((m.get("sender") or {}).get("id", 0)) != my_id],
        key=lambda m: (m.get("created_at") or "", m.get("id") or 0),
    )
    last_other_id = 0
    for m in incoming_other_sorted:
        last_other_id = max(last_other_id, int(m.get("id") or 0))
    if last_other_id:
        rec.last_seen_message_id[str(chat_id)] = last_other_id
        await store.set_record(query.from_user.id, rec)


@router.callback_query(F.data == "list:chats")
async def cb_list_chats(query: CallbackQuery) -> None:
    await query.answer()
    rec = store.get(query.from_user.id)
    if not rec:
        return
    fake_message = query.message
    if fake_message:
        await show_chats_list(fake_message, rec)


@router.callback_query(F.data.startswith("reply:"))
async def cb_reply(query: CallbackQuery, state: FSMContext) -> None:
    await query.answer()
    rec = store.get(query.from_user.id)
    if not rec:
        return
    chat_id = int(query.data.split(":", 1)[1])
    await state.set_state(ReplyStates.waiting_text)
    await state.update_data(reply_chat_id=chat_id)
    await query.message.answer(
        t(rec.lang, "reply_hint"),
        reply_markup=cancel_only_keyboard(rec.lang),
    )


@router.message(ReplyStates.waiting_text, F.text)
async def reply_text(message: Message, state: FSMContext) -> None:
    rec = store.get(message.from_user.id)
    if not rec:
        await state.clear()
        return
    if message.text == t(rec.lang, "cancel"):
        await state.clear()
        await message.answer("OK", reply_markup=main_keyboard(rec.lang))
        return
    data = await state.get_data()
    chat_id = int(data.get("reply_chat_id") or 0)
    if not chat_id:
        await state.clear()
        return
    ok, new_c = await api_post_message(rec.cookies, chat_id, message.text)
    rec.cookies = new_c
    await store.set_record(message.from_user.id, rec)
    await state.clear()
    if ok:
        await message.answer(t(rec.lang, "sent_ok"), reply_markup=main_keyboard(rec.lang))
    else:
        await message.answer(t(rec.lang, "send_error"), reply_markup=main_keyboard(rec.lang))


@router.callback_query(F.data == "menu:main")
async def cb_menu_main(query: CallbackQuery, state: FSMContext) -> None:
    await query.answer()
    await state.clear()
    rec = store.get(query.from_user.id)
    if rec:
        await query.message.answer("—", reply_markup=main_keyboard(rec.lang))


def _logout_kb(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=t(lang, "yes"), callback_data="logout:yes"),
                InlineKeyboardButton(text=t(lang, "no"), callback_data="logout:no"),
            ],
        ]
    )


@router.message(F.text.in_(_LABEL_MAIN_LOGOUT))
async def logout_press(message: Message) -> None:
    rec = store.get(message.from_user.id)
    if not rec:
        return
    if message.text != t(rec.lang, "main_logout"):
        return
    rec.logout_confirm = True
    await store.set_record(message.from_user.id, rec)
    await upsert_ui_message(
        message,
        message.from_user.id,
        rec,
        t(rec.lang, "logout_confirm"),
        reply_markup=_logout_kb(rec.lang),
        ensure_visible=True,
    )


@router.callback_query(F.data.startswith("logout:"))
async def logout_cb(query: CallbackQuery) -> None:
    await query.answer()
    rec = store.get(query.from_user.id)
    if not rec:
        return
    if query.data.endswith(":yes"):
        await store.delete(query.from_user.id)
        await query.message.answer(t(rec.lang, "logged_out"), reply_markup=ReplyKeyboardRemove())
    else:
        rec.logout_confirm = False
        await store.set_record(query.from_user.id, rec)
        await query.message.answer("OK", reply_markup=main_keyboard(rec.lang))


@router.message(F.text.in_(_LABEL_MAIN_LANG))
async def lang_menu(message: Message) -> None:
    rec = store.get(message.from_user.id)
    if not rec:
        return
    if message.text != t(rec.lang, "main_lang"):
        return
    await upsert_ui_message(
        message,
        message.from_user.id,
        rec,
        t(rec.lang, "choose_lang"),
        reply_markup=lang_keyboard(),
        ensure_visible=True,
    )


@router.callback_query(F.data.startswith("lang:"))
async def lang_set(query: CallbackQuery) -> None:
    await query.answer()
    rec = store.get(query.from_user.id)
    if not rec:
        return
    lang = query.data.split(":", 1)[1]
    if lang not in STRINGS:
        lang = "cz"
    rec.lang = lang
    await store.set_record(query.from_user.id, rec)
    await query.message.answer("OK", reply_markup=main_keyboard(rec.lang))


@router.message(Command("dev_session"))
async def dev_session(message: Message) -> None:
    if not ALLOW_DEV_SESSION:
        return
    rec = store.get(message.from_user.id)
    if not rec:
        await message.answer("No link. Use site deep link first.")
        return
    parts = (message.text or "").split(maxsplit=1)
    if len(parts) < 2:
        await message.answer(t(rec.lang, "dev_usage"))
        return
    raw = parts[1]
    cookies: dict[str, str] = dict(rec.cookies)
    for piece in raw.split():
        if "=" in piece:
            k, v = piece.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k in ("sessionid", "csrftoken"):
                cookies[k] = v
    rec.cookies = cookies
    await store.set_record(message.from_user.id, rec)
    await message.answer(t(rec.lang, "dev_ok"))


@router.message(F.text)
async def ignore_other_in_reply_state(message: Message, state: FSMContext) -> None:
    """Заглушка: вне FSM текст обрабатывается другими хендлерами."""
    st = await state.get_state()
    if st == ReplyStates.waiting_text.state:
        return
    rec = store.get(message.from_user.id)
    if rec and message.text in (
        t(rec.lang, "main_chats"),
        t(rec.lang, "main_lang"),
        t(rec.lang, "main_logout"),
    ):
        return
    return


# ---------------------------------------------------------------------------
# Фоновые уведомления о новых сообщениях
# ---------------------------------------------------------------------------

async def notification_loop(bot: Bot) -> None:
    while True:
        try:
            for tg_id_str, rec in list(store.users.items()):
                tg_id = int(tg_id_str)
                if not rec.cookies.get("sessionid"):
                    continue
                cookies_before = dict(rec.cookies)
                chats, new_c = await api_get_chats(rec.cookies)
                rec.cookies = new_c
                dirty = rec.cookies != cookies_before
                if not rec.notif_initialized:
                    for chat in chats:
                        cid = int(chat.get("chatid") or 0)
                        if not cid:
                            continue
                        lm = chat.get("last_message") or {}
                        mid = int(lm.get("id") or 0)
                        if mid:
                            rec.last_seen_message_id[str(cid)] = mid
                    rec.notif_initialized = True
                    dirty = True
                    await store.set_record(tg_id, rec)
                    continue
                for chat in chats:
                    cid = int(chat.get("chatid") or 0)
                    if not cid:
                        continue
                    last_msg = chat.get("last_message") or {}
                    mid = int(last_msg.get("id") or 0)
                    if not mid:
                        continue
                    sender = last_msg.get("sender") or {}
                    sid = int(sender.get("id") or 0)
                    if sid == rec.site_user_id or sid == 0:
                        continue
                    prev = rec.last_seen_message_id.get(str(cid), 0)
                    if mid > prev:
                        rec.last_seen_message_id[str(cid)] = mid
                        dirty = True
                        name = _display_name(sender)
                        preview = (last_msg.get("text") or "")[:500]
                        text = t(rec.lang, "notify_new", name=name) + "\n" + preview
                        try:
                            await bot.send_message(tg_id, text[:4096])
                        except Exception as e:
                            log.warning("notify %s: %s", tg_id, e)
                if dirty:
                    await store.set_record(tg_id, rec)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            log.exception("notification_loop: %s", e)
        await asyncio.sleep(POLL_INTERVAL_SEC)


# ---------------------------------------------------------------------------
# Сборка диспетчера (одинаково для polling и webhook)
# ---------------------------------------------------------------------------

def build_dispatcher() -> Dispatcher:
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)
    return dp


async def on_startup_bot(bot: Bot) -> None:
    await store.load()
    if WEBHOOK_URL:
        await bot.set_webhook(WEBHOOK_URL, drop_pending_updates=True)
        log.info("Webhook set to %s", WEBHOOK_URL)
    else:
        await bot.delete_webhook(drop_pending_updates=False)
    asyncio.create_task(notification_loop(bot))


async def on_shutdown_bot(bot: Bot) -> None:
    if WEBHOOK_URL:
        await bot.delete_webhook(drop_pending_updates=False)


async def run_polling() -> None:
    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = build_dispatcher()
    dp.startup.register(on_startup_bot)
    await dp.start_polling(bot)


def main_webhook_app() -> web.Application:
    bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = build_dispatcher()
    dp.startup.register(on_startup_bot)
    dp.shutdown.register(on_shutdown_bot)

    app = web.Application()
    handler = SimpleRequestHandler(dispatcher=dp, bot=bot)
    handler.register(app, path=WEBHOOK_PATH)
    setup_application(app, dp, bot=bot)
    return app


async def run_webhook_server() -> None:
    app = main_webhook_app()
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host=WEBHOOK_HOST, port=WEBHOOK_PORT)
    await site.start()
    log.info("Webhook server listening %s:%s path=%s", WEBHOOK_HOST, WEBHOOK_PORT, WEBHOOK_PATH)
    await asyncio.Event().wait()


def main() -> int:
    global BOT_TOKEN, LINK_SECRET_RAW, FLATFLY_API_BASE  # noqa: PLW0603

    if len(sys.argv) >= 2 and sys.argv[1] == "--sign-link":
        LINK_SECRET_RAW = _require_env("LINK_SECRET")
        old = sys.argv
        sys.argv = [old[0]] + old[2:]
        try:
            return _sign_link_cli()
        finally:
            sys.argv = old

    BOT_TOKEN = _env("TELEGRAM_CHAT_BOT_TOKEN", "") or _env("BOT_TOKEN", "") or _env("TELEGRAM_BOT_TOKEN", "")
    if not BOT_TOKEN:
        raise RuntimeError("Missing required environment variable: BOT_TOKEN (or TELEGRAM_BOT_TOKEN)")
    LINK_SECRET_RAW = _env("LINK_SECRET", "") or _env("TELEGRAM_LINK_SECRET", "")
    if not LINK_SECRET_RAW:
        raise RuntimeError("Missing required environment variable: LINK_SECRET (or TELEGRAM_LINK_SECRET)")
    if len(LINK_SECRET_RAW.encode("utf-8")) < 16:
        log.warning("LINK_SECRET is shorter than 16 bytes — recommended to use a longer secret.")
    base = (_env("FLATFLY_API_BASE", "") or "http://127.0.0.1:8000").rstrip("/")
    FLATFLY_API_BASE = base
    api.base_url = base

    if WEBHOOK_URL:
        asyncio.run(run_webhook_server())
    else:
        asyncio.run(run_polling())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
