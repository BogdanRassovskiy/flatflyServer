"""Helpers for chat features (housing groups, listing cards)."""


def listing_to_preview_dict(listing, request=None):
    """Serializable preview for a listing message bubble."""
    image_urls = []
    qs = getattr(listing, "images", None)
    if qs is not None:
        ordered = qs.order_by("-is_primary", "uploaded_at")
        for row in ordered:
            if getattr(row, "image", None):
                rel = row.image.url
                image_urls.append(request.build_absolute_uri(rel) if request else rel)

    image_url = image_urls[0] if image_urls else None

    type_map = {
        "APARTMENT": "apartments",
        "ROOM": "rooms",
        "BYT": "apartments",
        "DUM": "apartments",
        "NEIGHBOUR": "neighbours",
    }
    path_prefix = type_map.get(listing.type, "apartments")
    path = f"/{path_prefix}/{listing.id}"

    amenities = listing.amenities if isinstance(listing.amenities, list) else []

    return {
        "id": listing.id,
        "type": listing.type,
        "title": listing.title or "",
        "price": str(listing.price) if listing.price is not None else "",
        "currency": listing.currency or "",
        "city": listing.city or "",
        "region": listing.region or "",
        "address": listing.address or "",
        "image": image_url,
        "images": image_urls,
        "rooms": listing.rooms,
        "size": listing.size,
        "amenities": amenities,
        "path": path,
    }
