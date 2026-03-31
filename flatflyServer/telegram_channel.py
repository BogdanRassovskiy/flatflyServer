from __future__ import annotations

from datetime import datetime
from html import escape
from typing import Optional, List

from aiogram import Bot
from aiogram.types import FSInputFile, InlineKeyboardButton, InlineKeyboardMarkup
from asgiref.sync import async_to_sync
from django.conf import settings
from django.utils import timezone

from listings.models import Listing


def _listing_path(listing: Listing) -> str:
    kind = str(listing.type or "").upper()
    if kind == "ROOM":
        return f"/rooms/{listing.id}"
    if kind == "NEIGHBOUR":
        return f"/neighbours/{listing.id}"
    return f"/apartments/{listing.id}"


def _listing_url(listing: Listing) -> str:
    base = str(getattr(settings, "LISTING_PUBLIC_BASE_URL", "https://flatfly.eu")).rstrip("/")
    return f"{base}{_listing_path(listing)}"


def _compose_caption(listing: Listing, extra_photos: int = 0) -> str:
    region = listing.get_region_display() if hasattr(listing, "get_region_display") else (listing.region or "")
    location = ", ".join([part for part in [listing.city, region] if part])
    price = f"{listing.price} {listing.currency} / месяц"
    pieces = [
        f"<b>{escape(str(listing.title or 'Listing'))}</b>",
    ]

    description = (listing.description or "").strip()
    if description:
        trimmed = description[:420] + ("..." if len(description) > 420 else "")
        pieces.append("")
        pieces.append(escape(trimmed))

    # Порядок: описание, адрес, площадь, цена, коммунальные, депозит, дата въезда.
    if location:
        pieces.append("")
        pieces.append(f"📍 Адрес: {escape(location)}")

    area_value = listing.size or listing.rooms
    if area_value:
        pieces.append(f"📐 Площадь: {area_value} м²")

    pieces.append("")
    pieces.append(f"💰 Цена: <b>{escape(price)}</b>")

    utilities_fee_text = f"{listing.utilities_fee} {listing.currency}"
    if listing.utilities_included:
        pieces.append(f"🧾 Коммунальные: включены ({escape(utilities_fee_text)})")
    else:
        pieces.append(f"🧾 Коммунальные: не включены ({escape(utilities_fee_text)})")

    pieces.append(f"🔒 Депозит: {escape(str(listing.deposit))} {escape(str(listing.currency))}")

    if listing.move_in_date:
        move_in = listing.move_in_date
        if isinstance(move_in, datetime):
            move_in = move_in.date()
        pieces.append(f"📅 Дата въезда: {escape(str(move_in))}")

    if extra_photos > 0:
        pieces.append("")
        pieces.append("📸 Остальные фото смотрите в объявлении по кнопке ниже.")
    return "\n".join(pieces)[:1000]


def _can_publish() -> bool:
    return bool(getattr(settings, "TELEGRAM_BOT_TOKEN", "").strip()) and bool(
        str(getattr(settings, "TELEGRAM_CHANNEL_CHAT_ID", "")).strip()
    )


async def _send_listing_async(image_path: str, caption: str, button_url: str) -> List[int]:
    token = str(settings.TELEGRAM_BOT_TOKEN).strip()
    chat_id = str(settings.TELEGRAM_CHANNEL_CHAT_ID).strip()
    if not token or not chat_id or not image_path:
        return []

    button = InlineKeyboardButton(text="Получить контакт", url=button_url)
    markup = InlineKeyboardMarkup(inline_keyboard=[[button]])

    sent_ids: List[int] = []
    async with Bot(token=token) as bot:
        sent = await bot.send_photo(
            chat_id=chat_id,
            photo=FSInputFile(image_path),
            caption=caption,
            parse_mode="HTML",
            reply_markup=markup,
        )
        sent_ids.append(int(sent.message_id))
    return sent_ids


def publish_listing_to_channel(listing: Listing, force_refresh: bool = False) -> Optional[int]:
    existing_ids = [int(x) for x in (listing.telegram_channel_message_ids or []) if str(x).isdigit()]
    if force_refresh and (existing_ids or listing.telegram_channel_message_id):
        delete_listing_from_channel(listing, clear_fields=False)
        listing.telegram_channel_message_id = None
        listing.telegram_channel_message_ids = []
        listing.telegram_channel_posted_at = None
        listing.save(update_fields=["telegram_channel_message_id", "telegram_channel_message_ids", "telegram_channel_posted_at"])
        existing_ids = []

    if existing_ids:
        return existing_ids[0]
    if listing.telegram_channel_message_id:
        return int(listing.telegram_channel_message_id)
    if not _can_publish():
        return None
    images_qs = listing.images.order_by("-is_primary", "id")
    image = images_qs.first()
    if not image:
        return None
    total_images = images_qs.count()
    image_path = str(getattr(image.image, "path", "") or "").strip()
    if not image_path:
        return None
    caption = _compose_caption(listing, extra_photos=max(0, total_images - 1))
    button_url = _listing_url(listing)
    try:
        sent_ids = async_to_sync(_send_listing_async)(image_path, caption, button_url)
    except Exception:
        return None
    if sent_ids:
        listing.telegram_channel_message_id = sent_ids[0]
        listing.telegram_channel_message_ids = sent_ids
        listing.telegram_channel_posted_at = timezone.now()
        listing.save(update_fields=["telegram_channel_message_id", "telegram_channel_message_ids", "telegram_channel_posted_at"])
        return sent_ids[0]
    return None


async def _delete_listing_async(message_id: int) -> bool:
    token = str(settings.TELEGRAM_BOT_TOKEN).strip()
    chat_id = str(settings.TELEGRAM_CHANNEL_CHAT_ID).strip()
    if not token or not chat_id:
        return False
    async with Bot(token=token) as bot:
        try:
            return bool(await bot.delete_message(chat_id=chat_id, message_id=int(message_id)))
        except Exception:
            return False


def delete_listing_from_channel(listing: Listing, clear_fields: bool = True) -> bool:
    message_ids = [int(x) for x in (listing.telegram_channel_message_ids or []) if str(x).isdigit()]
    if not message_ids and listing.telegram_channel_message_id:
        message_ids = [int(listing.telegram_channel_message_id)]
    if not message_ids:
        return False
    deleted_any = False
    for mid in message_ids:
        deleted_any = async_to_sync(_delete_listing_async)(mid) or deleted_any
    if clear_fields:
        listing.telegram_channel_message_id = None
        listing.telegram_channel_message_ids = []
        listing.telegram_channel_posted_at = None
        listing.save(update_fields=["telegram_channel_message_id", "telegram_channel_message_ids", "telegram_channel_posted_at"])
    return deleted_any

