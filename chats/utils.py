"""Helpers for chat features (housing groups, listing cards)."""


def listing_to_preview_dict(listing, request=None):
    """Serializable preview for a listing message bubble."""
    image_url = None
    qs = getattr(listing, "images", None)
    if qs is not None:
        primary = qs.filter(is_primary=True).first()
        first = qs.order_by("uploaded_at").first()
        chosen = primary or first
        if chosen and getattr(chosen, "image", None):
            rel = chosen.image.url
            image_url = request.build_absolute_uri(rel) if request else rel

    type_map = {
        "APARTMENT": "apartments",
        "ROOM": "rooms",
        "BYT": "apartments",
        "DUM": "apartments",
        "NEIGHBOUR": "neighbours",
    }
    path_prefix = type_map.get(listing.type, "apartments")
    path = f"/{path_prefix}/{listing.id}"

    return {
        "id": listing.id,
        "type": listing.type,
        "title": listing.title or "",
        "price": str(listing.price) if listing.price is not None else "",
        "currency": listing.currency or "",
        "city": listing.city or "",
        "region": listing.region or "",
        "image": image_url,
        "path": path,
    }
