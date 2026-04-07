from django.shortcuts import render,redirect,get_object_or_404
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
import json
import re
import uuid
import math
import threading
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
import unicodedata
from django.http import JsonResponse, HttpResponse
import requests
from django.conf import settings
from django.contrib.auth import get_user_model, login, logout, authenticate
import jwt
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST,require_http_methods
from django.db import close_old_connections
from django.db.models import Q, Avg, Count, Max, Prefetch
from django.utils import timezone
from users.models import Profile, ProfileCompletionWeight, ProfileGalleryPhoto, ProfileRankingConfig, ProfileReview, University, UniversityFaculty
from chats.models import ChatBlock
from users.neighbour_ranking import (
    apply_neighbour_hard_filters,
    calculate_neighbour_relevance,
    normalize_neighbour_ranking_configs,
    parse_neighbour_filters,
)
from listings.models import Listing, ListingFilterConfig, ListingFilterOptionConfig, ListingImage, ListingInvite, ListingResident, CzechMunicipality, CzechStreet, ListingReport
from article.models import LaunchSettings, default_launch_date
from django.core.paginator import Paginator

from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.urls import reverse
from urllib.parse import urlencode
from django.core.files.base import ContentFile
from .image_moderation import moderate_image, apply_moderation_strike_and_notify
from .telegram_channel import publish_listing_to_channel, delete_listing_from_channel
User = get_user_model()
DEBUG_MODE=True;


def normalize_listing_type(value):
    normalized = str(value or "").upper()
    if normalized in ["BYT", "DUM", "APARTMENT"]:
        return "APARTMENT"
    if normalized == "ROOM":
        return "ROOM"
    if normalized == "NEIGHBOUR":
        return "NEIGHBOUR"
    return normalized or "APARTMENT"


def normalize_text(value):
    return unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii").lower().strip()


def get_ordered_listing_images(listing):
    return listing.images.order_by("-is_primary", "id")


def get_primary_listing_image(listing):
    return get_ordered_listing_images(listing).first()


PROFILE_COMPLETION_DEFAULTS = [
    ("name", "Name", Decimal("8.00")),
    ("phone", "Phone", Decimal("6.00")),
    ("age", "Age", Decimal("5.00")),
    ("gender", "Gender", Decimal("4.00")),
    ("city", "Region", Decimal("4.00")),
    ("location_city", "Location City", Decimal("4.00")),
    ("location_address", "Location Address", Decimal("5.00")),
    ("university", "University", Decimal("8.00")),
    ("faculty", "Faculty", Decimal("5.00")),
    ("profession", "Profession", Decimal("6.00")),
    ("languages", "Languages", Decimal("7.00")),
    ("about", "About", Decimal("8.00")),
    ("smoking", "Smoking", Decimal("4.00")),
    ("alcohol", "Alcohol", Decimal("4.00")),
    ("sleep_schedule", "Sleep Schedule", Decimal("4.00")),
    ("noise_tolerance", "Noise Tolerance", Decimal("3.00")),
    ("gamer", "Gamer", Decimal("3.00")),
    ("work_from_home", "Work From Home", Decimal("3.00")),
    ("pets", "Pets", Decimal("3.00")),
    ("cleanliness", "Cleanliness", Decimal("2.00")),
    ("introvert_extrovert", "Introvert/Extrovert", Decimal("2.00")),
    ("guests_parties", "Guests / Parties", Decimal("3.00")),
    ("preferred_gender", "Preferred Gender", Decimal("3.00")),
    ("preferred_age_range", "Preferred Age Range", Decimal("3.00")),
    ("verified", "Verified Profile", Decimal("30.00")),
]

PROFILE_COMPLETION_MIN_VERIFIED_SHARE = Decimal("0.20")
PROFILE_COMPLETION_DEFAULT_VERIFIED_WEIGHT = Decimal("30.00")


def _is_profile_field_filled(profile, attribute_key):
    text_fields = {
        "name": profile.name,
        "phone": profile.phone,
        "gender": profile.gender,
        "city": profile.city,
        "location_city": profile.location_city,
        "location_address": profile.location_address,
        "profession": profile.profession,
        "instagram": profile.instagram,
        "facebook": profile.facebook,
        "about": profile.about,
        "smoking": profile.smoking,
        "alcohol": profile.alcohol,
        "sleep_schedule": profile.sleep_schedule,
        "noise_tolerance": profile.noise_tolerance,
        "gamer": profile.gamer,
        "work_from_home": profile.work_from_home,
        "pets": profile.pets,
        "guests_parties": profile.guests_parties,
        "preferred_gender": profile.preferred_gender,
        "preferred_age_range": profile.preferred_age_range,
    }

    if attribute_key in text_fields:
        return bool(str(text_fields[attribute_key] or "").strip())

    if attribute_key == "languages":
        languages = [item.strip() for item in str(profile.languages or "").split(",") if item.strip()]
        return len(languages) > 0
    if attribute_key == "age":
        return profile.age is not None
    if attribute_key == "university":
        return bool(profile.university_id)
    if attribute_key == "faculty":
        return bool(profile.faculty_id)
    if attribute_key == "cleanliness":
        return profile.cleanliness is not None and int(profile.cleanliness) != 5
    if attribute_key == "introvert_extrovert":
        return profile.introvert_extrovert is not None and int(profile.introvert_extrovert) != 5
    if attribute_key == "verified":
        return bool(profile.verified)

    return False


def _calculate_profile_completion(profile):
    configured_weights = list(
        ProfileCompletionWeight.objects.filter(is_active=True).values("attribute_key", "label", "weight")
    )

    if configured_weights:
        items = configured_weights
    else:
        items = [
            {"attribute_key": key, "label": label, "weight": weight}
            for key, label, weight in PROFILE_COMPLETION_DEFAULTS
        ]

    normalized_items = []
    for item in items:
        attribute_key = str(item.get("attribute_key") or "").strip()
        label = str(item.get("label") or attribute_key).strip() or attribute_key
        raw_weight = item.get("weight")
        try:
            weight = Decimal(str(raw_weight))
        except (InvalidOperation, TypeError, ValueError):
            continue

        if not attribute_key or weight <= 0:
            continue

        normalized_items.append({
            "attribute_key": attribute_key,
            "label": label,
            "weight": weight,
        })

    verified_item_index = next(
        (index for index, item in enumerate(normalized_items) if item["attribute_key"] == "verified"),
        None,
    )

    if verified_item_index is None:
        normalized_items.append({
            "attribute_key": "verified",
            "label": "Verified Profile",
            "weight": PROFILE_COMPLETION_DEFAULT_VERIFIED_WEIGHT,
        })
        verified_item_index = len(normalized_items) - 1

    verified_item = normalized_items[verified_item_index]
    other_weight_sum = sum(
        item["weight"] for index, item in enumerate(normalized_items) if index != verified_item_index
    )
    minimum_verified_weight = (
        (other_weight_sum * PROFILE_COMPLETION_MIN_VERIFIED_SHARE)
        / (Decimal("1") - PROFILE_COMPLETION_MIN_VERIFIED_SHARE)
        if other_weight_sum > 0
        else PROFILE_COMPLETION_DEFAULT_VERIFIED_WEIGHT
    )
    if verified_item["weight"] < minimum_verified_weight:
        verified_item["weight"] = minimum_verified_weight

    total_weight = Decimal("0")
    filled_weight = Decimal("0")
    total_fields = 0
    missing_fields = []
    missing_field_keys = []

    for item in normalized_items:
        attribute_key = item["attribute_key"]
        weight = item["weight"]

        if weight <= 0:
            continue

        total_fields += 1
        total_weight += weight
        is_filled = _is_profile_field_filled(profile, attribute_key)
        if is_filled:
            filled_weight += weight
        else:
            missing_fields.append(item["label"])
            missing_field_keys.append(attribute_key)

    percentage = int(round((filled_weight / total_weight) * 100)) if total_weight > 0 else 0

    return {
        "percentage": max(0, min(100, percentage)),
        "filledWeight": float(filled_weight),
        "totalWeight": float(total_weight),
        "missingFields": missing_fields,
        "missingFieldKeys": missing_field_keys,
        "missingCount": len(missing_fields),
        "totalFields": total_fields,
    }


def is_valid_municipality_name(city_name, region_code=None):
    city_text = str(city_name or "").strip()
    if not city_text:
        return False

    normalized_city = normalize_text(city_text)
    qs = CzechMunicipality.objects.filter(
        Q(name__iexact=city_text) | Q(normalized_name=normalized_city)
    )
    if region_code:
        qs = qs.filter(region_code=str(region_code).upper())
    return qs.exists()


def _is_meaningful_text(value):
    text = str(value or "").strip()
    if not text:
        return False
    return re.search(r"[A-Za-zА-Яа-я0-9]", text) is not None


def _safe_listing_title(listing):
    title = str(listing.title or "").strip()
    if _is_meaningful_text(title):
        return title

    address = str(listing.address or "").strip()
    if _is_meaningful_text(address):
        return address

    return f"Listing #{listing.id}"


def _safe_listing_description(listing):
    description = str(listing.description or "").strip()
    if _is_meaningful_text(description):
        return description
    return ""


@require_http_methods(["GET"])
def municipalities_search(request):
    query = str(request.GET.get("q") or "").strip()
    region = str(request.GET.get("region") or "").strip().upper()

    try:
        limit = int(request.GET.get("limit", 12))
    except (TypeError, ValueError):
        limit = 12
    limit = max(1, min(limit, 30))

    if not query:
        return JsonResponse({"results": []})

    normalized_query = normalize_text(query)
    base_qs = CzechMunicipality.objects.filter(
        Q(name__icontains=query) | Q(normalized_name__contains=normalized_query)
    )

    qs = base_qs
    if region:
        qs = base_qs.filter(region_code=region)

    items = list(qs.order_by("name").values("name", "region_code", "municipality_type", "latitude", "longitude")[:limit])

    # Fallback: when dictionary for selected region is not populated yet,
    # return global suggestions instead of empty list.
    if region and not items:
        items = list(
            base_qs.order_by("name").values("name", "region_code", "municipality_type", "latitude", "longitude")[:limit]
        )

    return JsonResponse({"results": items})


REGION_NAME_TO_CODE = {
    "praha": "PRAGUE",
    "hlavni mesto praha": "PRAGUE",
    "stredocesky kraj": "STREDOCESKY",
    "jihocesky kraj": "JIHOCESKY",
    "plzensky kraj": "PLZENSKY",
    "karlovarsky kraj": "KARLOVARSKY",
    "ustecky kraj": "USTECKY",
    "liberecky kraj": "LIBERECKY",
    "kralovehradecky kraj": "KRALOVEHRADECKY",
    "pardubicky kraj": "PARDUBICKY",
    "vysocina": "VYSOCINA",
    "kraj vysocina": "VYSOCINA",
    "jihomoravsky kraj": "JIHOMORAVSKY",
    "olomoucky kraj": "OLOMOUCKY",
    "zlinsky kraj": "ZLINSKY",
    "moravskoslezsky kraj": "MORAVSKOSLEZSKY",
}


def map_region_name_to_code(region_name):
    normalized = normalize_text(region_name)
    return REGION_NAME_TO_CODE.get(normalized)


@require_http_methods(["GET"])
def reverse_geocode(request):
    lat = _parse_float_safe(request.GET.get("lat"))
    lng = _parse_float_safe(request.GET.get("lng"))

    if lat is None or lng is None:
        return JsonResponse({"detail": "lat and lng are required"}, status=400)
    if lat < -90 or lat > 90 or lng < -180 or lng > 180:
        return JsonResponse({"detail": "invalid coordinates"}, status=400)

    url = "https://nominatim.openstreetmap.org/reverse"
    try:
        response = requests.get(
            url,
            params={
                "lat": lat,
                "lon": lng,
                "format": "jsonv2",
                "addressdetails": 1,
                "zoom": 18,
            },
            headers={"User-Agent": "flatflyServer/reverse-geocode"},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json() or {}
    except Exception:
        return JsonResponse({"detail": "reverse geocoding failed"}, status=502)

    addr = payload.get("address") or {}
    road = str(addr.get("road") or "").strip()
    house_number = str(addr.get("house_number") or "").strip()

    city_candidate = (
        addr.get("city")
        or addr.get("town")
        or addr.get("village")
        or addr.get("municipality")
        or addr.get("city_district")
        or ""
    )
    city_text = str(city_candidate or "").strip()

    state_text = str(addr.get("state") or "").strip()
    region_code = map_region_name_to_code(state_text)

    municipality = None
    if city_text:
        municipality_qs = CzechMunicipality.objects.filter(
            Q(name__iexact=city_text) | Q(normalized_name=normalize_text(city_text))
        )
        if region_code:
            municipality_qs = municipality_qs.filter(region_code=region_code)
        municipality = municipality_qs.order_by("id").first()

        if municipality:
            city_text = municipality.name
            region_code = municipality.region_code or region_code

    address_text = " ".join(part for part in [road, house_number] if part).strip()
    street_in_dictionary = False
    if address_text and city_text:
        street_qs = CzechStreet.objects.filter(
            Q(name__iexact=address_text) | Q(normalized_name=normalize_text(address_text)),
            Q(city_name__iexact=city_text) | Q(normalized_city_name=normalize_text(city_text)),
        )
        if region_code:
            street_qs = street_qs.filter(region_code=region_code)
        street_in_dictionary = street_qs.exists()

    return JsonResponse({
        "region_code": region_code,
        "city": city_text,
        "address": address_text,
        "city_in_dictionary": municipality is not None,
        "street_in_dictionary": street_in_dictionary,
    })


@require_http_methods(["GET"])
def streets_search(request):
    query = str(request.GET.get("q") or "").strip()
    city = str(request.GET.get("city") or "").strip()
    region = str(request.GET.get("region") or "").strip().upper()

    try:
        limit = int(request.GET.get("limit", 12))
    except (TypeError, ValueError):
        limit = 12
    limit = max(1, min(limit, 30))

    if not city:
        return JsonResponse({"results": []})

    normalized_city = normalize_text(city)
    qs = CzechStreet.objects.filter(
        Q(city_name__iexact=city) | Q(normalized_city_name=normalized_city)
    )

    if region:
        qs = qs.filter(region_code=region)

    if query:
        normalized_query = normalize_text(query)
        qs = qs.filter(
            Q(name__icontains=query) | Q(normalized_name__contains=normalized_query)
        )

    rows = qs.order_by("name").values("name", "city_name", "region_code", "latitude", "longitude")[:limit]
    results = []
    for item in rows:
        lat = item.get("latitude")
        lng = item.get("longitude")
        results.append({
            "name": item.get("name"),
            "city_name": item.get("city_name"),
            "region_code": item.get("region_code"),
            "latitude": float(lat) if lat is not None else None,
            "longitude": float(lng) if lng is not None else None,
            "full_address": f"{item.get('name')}, {item.get('city_name')}",
        })

    return JsonResponse({"results": results})


def resolve_street_coordinates(address, city, region):
    address_text = str(address or "").strip()
    city_text = str(city or "").strip()
    region_text = str(region or "").strip().upper()
    if not address_text or not city_text:
        return None, None

    normalized_address = normalize_text(address_text)
    normalized_city = normalize_text(city_text)
    qs = CzechStreet.objects.filter(
        Q(name__iexact=address_text) | Q(normalized_name=normalized_address),
        Q(city_name__iexact=city_text) | Q(normalized_city_name=normalized_city),
    )
    if region_text:
        qs = qs.filter(region_code=region_text)

    street = qs.order_by("id").first()
    if not street or street.latitude is None or street.longitude is None:
        return None, None

    return street.latitude, street.longitude


def _run_in_background(task_name, target, *args, **kwargs):
    def _wrapped():
        close_old_connections()
        try:
            target(*args, **kwargs)
        except Exception as exc:
            print(f"[bg:{task_name}] failed: {exc}")
        finally:
            close_old_connections()

    threading.Thread(
        target=_wrapped,
        name=f"flatfly-{task_name}",
        daemon=True,
    ).start()


def _resolve_listing_coordinates_async(listing_id):
    listing = Listing.objects.filter(id=listing_id).first()
    if not listing:
        return
    if listing.geo_lat is not None and listing.geo_lng is not None:
        return
    resolved_lat, resolved_lng = resolve_street_coordinates(listing.address, listing.city, listing.region)
    if resolved_lat is not None and resolved_lng is not None:
        listing.geo_lat = resolved_lat
        listing.geo_lng = resolved_lng
        listing.save(update_fields=["geo_lat", "geo_lng"])


def _publish_listing_to_channel_async(listing_id, force_refresh=False):
    listing = Listing.objects.filter(id=listing_id).first()
    if not listing or not listing.is_active:
        return
    publish_listing_to_channel(listing, force_refresh=force_refresh)


def _parse_bool_choice(raw_value):
    value = str(raw_value or "").strip().lower()
    if value in ["yes", "true", "1"]:
        return True
    if value in ["no", "false", "0", "not"]:
        return False
    return None


def _parse_float_safe(raw_value):
    if raw_value is None or raw_value == "":
        return None
    try:
        return float(raw_value)
    except (TypeError, ValueError):
        return None


def _haversine_distance_km(point_a, point_b):
    if not point_a or not point_b:
        return None
    lat1, lng1 = point_a
    lat2, lng2 = point_b
    if lat1 is None or lng1 is None or lat2 is None or lng2 is None:
        return None

    lat1_rad = math.radians(float(lat1))
    lng1_rad = math.radians(float(lng1))
    lat2_rad = math.radians(float(lat2))
    lng2_rad = math.radians(float(lng2))

    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad

    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return 6371.0 * c


def _build_price_histogram(qs, buckets_count=28):
    prices = []
    for value in qs.values_list("price", flat=True):
        parsed = _parse_float_safe(value)
        if parsed is None:
            continue
        prices.append(float(parsed))

    if not prices:
        return {
            "min": 0,
            "max": 0,
            "total": 0,
            "max_count": 0,
            "buckets": [],
        }

    min_price = min(prices)
    max_price = max(prices)
    safe_buckets_count = max(8, min(int(buckets_count or 28), 48))

    if max_price <= min_price:
        bucket_items = []
        for index in range(safe_buckets_count):
            bucket_items.append({
                "from": round(min_price, 2),
                "to": round(max_price, 2),
                "count": len(prices) if index == 0 else 0,
            })
        return {
            "min": round(min_price, 2),
            "max": round(max_price, 2),
            "total": len(prices),
            "max_count": len(prices),
            "buckets": bucket_items,
        }

    bucket_size = (max_price - min_price) / safe_buckets_count
    counts = [0] * safe_buckets_count
    for price in prices:
        bucket_index = int((price - min_price) / bucket_size)
        if bucket_index >= safe_buckets_count:
            bucket_index = safe_buckets_count - 1
        counts[bucket_index] += 1

    bucket_items = []
    for index in range(safe_buckets_count):
        bucket_start = min_price + index * bucket_size
        bucket_end = min_price + (index + 1) * bucket_size
        if index == safe_buckets_count - 1:
            bucket_end = max_price
        bucket_items.append({
            "from": round(bucket_start, 2),
            "to": round(bucket_end, 2),
            "count": counts[index],
        })

    return {
        "min": round(min_price, 2),
        "max": round(max_price, 2),
        "total": len(prices),
        "max_count": max(counts) if counts else 0,
        "buckets": bucket_items,
    }


def _normalize_rooms_filter(raw_value):
    value = str(raw_value or "").strip()
    if not value:
        return None
    if value.endswith("+"):
        base = parse_int_value(value[:-1])
        return {"mode": "gte", "value": base}
    parsed = parse_int_value(value)
    if parsed is None:
        return None
    return {"mode": "eq", "value": parsed}


def _normalize_preferred_gender(raw_value, default=None):
    value = str(raw_value or "").strip().lower()
    if value in ["male", "female", "any"]:
        return value
    return default


def _build_requested_listing_filters(request):
    preferred_gender = _normalize_preferred_gender(request.GET.get("preferredGender"), None)
    if preferred_gender == "any":
        preferred_gender = None
    requested = {
        "property_type": None,
        "region": request.GET.get("region") or None,
        "price_from": _parse_float_safe(request.GET.get("priceFrom")),
        "price_to": _parse_float_safe(request.GET.get("priceTo")),
        "currency": request.GET.get("currency") or None,
        "preferred_gender": preferred_gender,
        "sort_by": request.GET.get("sortBy") or "price_asc",
        "rooms": _normalize_rooms_filter(request.GET.get("rooms")),
        "has_roommates": _parse_bool_choice(request.GET.get("hasRoommates")),
        "rental_period": request.GET.get("rentalPeriod") or None,
        "condition_state": request.GET.get("conditionState") or None,
        "energy_class": request.GET.get("energyClass") or None,
        "internet": _parse_bool_choice(request.GET.get("internet")),
        "utilities": _parse_bool_choice(request.GET.get("utilities")),
        "pets_allowed": _parse_bool_choice(request.GET.get("petsAllowed")),
        "smoking_allowed": _parse_bool_choice(request.GET.get("smokingAllowed")),
        "move_in_date": parse_date_safe(request.GET.get("moveInDate")),
        "amenities": [x for x in request.GET.getlist("amenities[]") if x],
        "infrastructure": [x for x in request.GET.getlist("infrastructure[]") if x],
    }

    listing_type = request.GET.get("propertyType")
    if listing_type:
        requested["property_type"] = normalize_listing_type(listing_type)

    return requested


def _rooms_match(rooms_value, room_filter):
    if room_filter is None:
        return True
    if rooms_value is None:
        return False
    mode = room_filter.get("mode")
    target = room_filter.get("value")
    if target is None:
        return False
    if mode == "gte":
        return rooms_value >= target
    return rooms_value == target


def _listing_filter_match_ratio(listing, code, expected_value):
    if expected_value is None:
        return None

    if code == "property_type":
        expected_type = normalize_listing_type(expected_value)
        if expected_type == "APARTMENT":
            return 1.0 if listing.type in ["APARTMENT", "BYT", "DUM"] else 0.0
        return 1.0 if listing.type == expected_type else 0.0

    if code == "region":
        return 1.0 if str(listing.region or "") == str(expected_value) else 0.0

    if code == "price_from":
        value = _parse_float_safe(expected_value)
        if value is None:
            return None
        return 1.0 if float(listing.price) >= value else 0.0

    if code == "price_to":
        value = _parse_float_safe(expected_value)
        if value is None:
            return None
        return 1.0 if float(listing.price) <= value else 0.0

    if code == "currency":
        return 1.0 if str(listing.currency or "") == str(expected_value) else 0.0

    if code == "preferred_gender":
        return 1.0 if str(listing.preferred_gender or "").lower() == str(expected_value).lower() else 0.0

    if code == "rooms":
        return 1.0 if _rooms_match(listing.rooms, expected_value) else 0.0

    if code == "has_roommates":
        return 1.0 if bool(listing.has_roommates) == bool(expected_value) else 0.0

    if code == "rental_period":
        return 1.0 if str(listing.rental_period or "") == str(expected_value) else 0.0

    if code == "condition_state":
        return 1.0 if str(listing.condition_state or "") == str(expected_value) else 0.0

    if code == "energy_class":
        return 1.0 if str(listing.energy_class or "") == str(expected_value) else 0.0

    if code == "internet":
        return 1.0 if bool(listing.internet) == bool(expected_value) else 0.0

    if code == "utilities":
        return 1.0 if bool(listing.utilities_included) == bool(expected_value) else 0.0

    if code == "pets_allowed":
        return 1.0 if bool(listing.pets_allowed) == bool(expected_value) else 0.0

    if code == "smoking_allowed":
        return 1.0 if bool(listing.smoking_allowed) == bool(expected_value) else 0.0

    if code == "move_in_date":
        if expected_value is None or listing.move_in_date is None:
            return 0.0
        return 1.0 if listing.move_in_date <= expected_value else 0.0

    if code == "amenities":
        if not expected_value:
            return None
        listing_amenities = set(listing.amenities or [])
        expected = [item for item in expected_value if item]
        if not expected:
            return None
        matched = sum(1 for item in expected if item in listing_amenities)
        return matched / len(expected)

    if code == "infrastructure":
        expected = [item for item in expected_value if item]
        if not expected:
            return None
        matched = sum(1 for field_name in expected if getattr(listing, field_name, False))
        return matched / len(expected)

    return None


def _option_match_ratio(listing, parent_code, option_key):
    option = str(option_key or "").strip()
    if not option:
        return 0.0

    if parent_code == "amenities":
        return 1.0 if option in set(listing.amenities or []) else 0.0

    if parent_code == "infrastructure":
        return 1.0 if bool(getattr(listing, option, False)) else 0.0

    return 0.0


def _apply_hard_filters(qs, requested_filters, config_by_code, option_configs_by_parent):
    for code, expected_value in requested_filters.items():
        config = config_by_code.get(code)
        if not config or not config.enabled or not config.hard_filter:
            continue
        if expected_value is None:
            continue
        if isinstance(expected_value, list) and not expected_value:
            continue

        if code == "property_type":
            expected_type = normalize_listing_type(expected_value)
            if expected_type == "APARTMENT":
                qs = qs.filter(type__in=["APARTMENT", "BYT", "DUM"])
            else:
                qs = qs.filter(type=expected_type)

        elif code == "region":
            qs = qs.filter(region=expected_value)

        elif code == "price_from":
            qs = qs.filter(price__gte=expected_value)

        elif code == "price_to":
            qs = qs.filter(price__lte=expected_value)

        elif code == "currency":
            qs = qs.filter(currency=expected_value)

        elif code == "preferred_gender":
            qs = qs.filter(preferred_gender=str(expected_value).lower())

        elif code == "rooms":
            if expected_value.get("mode") == "gte":
                qs = qs.filter(rooms__gte=expected_value.get("value"))
            else:
                qs = qs.filter(rooms=expected_value.get("value"))

        elif code == "has_roommates":
            qs = qs.filter(has_roommates=expected_value)

        elif code == "rental_period":
            qs = qs.filter(rental_period=expected_value)

        elif code == "condition_state":
            qs = qs.filter(condition_state=expected_value)

        elif code == "energy_class":
            qs = qs.filter(energy_class=expected_value)

        elif code == "internet":
            qs = qs.filter(internet=expected_value)

        elif code == "utilities":
            qs = qs.filter(utilities_included=expected_value)

        elif code == "pets_allowed":
            qs = qs.filter(pets_allowed=expected_value)

        elif code == "smoking_allowed":
            qs = qs.filter(smoking_allowed=expected_value)

        elif code == "move_in_date":
            qs = qs.filter(move_in_date__isnull=False, move_in_date__lte=expected_value)

        elif code == "amenities":
            option_map = option_configs_by_parent.get("amenities", {})
            if option_map:
                for amenity in expected_value:
                    option_cfg = option_map.get(amenity)
                    if option_cfg and option_cfg.enabled and option_cfg.hard_filter:
                        qs = qs.filter(amenities__contains=[amenity])
                continue

            for amenity in expected_value:
                qs = qs.filter(amenities__contains=[amenity])

        elif code == "infrastructure":
            option_map = option_configs_by_parent.get("infrastructure", {})
            if option_map:
                for infra_field in expected_value:
                    option_cfg = option_map.get(infra_field)
                    if option_cfg and option_cfg.enabled and option_cfg.hard_filter:
                        qs = qs.filter(**{infra_field: True})
                continue

            for infra_field in expected_value:
                qs = qs.filter(**{infra_field: True})

    return qs


def _calculate_listing_score(listing, requested_filters, config_by_code, option_configs_by_parent):
    total_weight = 0.0
    matched_weight = 0.0

    for code, expected_value in requested_filters.items():
        config = config_by_code.get(code)
        if not config or not config.enabled:
            continue
        if expected_value is None:
            continue
        if isinstance(expected_value, list) and not expected_value:
            continue

        if code in ["amenities", "infrastructure"] and isinstance(expected_value, list):
            option_map = option_configs_by_parent.get(code, {})
            if option_map:
                for option_key in expected_value:
                    option_cfg = option_map.get(option_key)
                    if not option_cfg or not option_cfg.enabled:
                        continue
                    option_weight = float(option_cfg.weight or 0)
                    if option_weight <= 0:
                        continue
                    ratio = _option_match_ratio(listing, code, option_key)
                    total_weight += option_weight
                    matched_weight += option_weight * ratio
                continue

        weight = float(config.weight or 0)
        if weight <= 0:
            continue

        ratio = _listing_filter_match_ratio(listing, code, expected_value)
        if ratio is None:
            continue

        ratio = max(0.0, min(1.0, float(ratio)))
        total_weight += weight
        matched_weight += weight * ratio

    if total_weight <= 0:
        return 0.0, 0

    percent = int(round((matched_weight / total_weight) * 100))
    return matched_weight, max(0, min(100, percent))


def are_profiles_co_residents(profile_a, profile_b):
    residency_a = ListingResident.objects.select_related("listing").filter(profile=profile_a).first()
    residency_b = ListingResident.objects.select_related("listing").filter(profile=profile_b).first()
    if not residency_a or not residency_b:
        return False
    return residency_a.listing_id == residency_b.listing_id


@ensure_csrf_cookie
def index(request):
    return render(request, 'index.html')

def google_login(request):
    query = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    })
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
    return redirect(google_auth_url)


@require_http_methods(["GET"])
def launch_date_view(request):
    launch_settings, _ = LaunchSettings.objects.get_or_create(
        id=1,
        defaults={"launch_date": default_launch_date()},
    )

    return JsonResponse({
        "launch_date": launch_settings.launch_date.isoformat()
    })

def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    user = request.user
    profile = None
    try:
        profile = user.profile
    except Profile.DoesNotExist:
        profile = None

    display_name = ""
    avatar_url = None
    if profile:
        display_name = str(profile.name or "").strip()
        if profile.avatar:
            avatar_url = request.build_absolute_uri(profile.avatar.url)
    if not display_name:
        display_name = f"{user.first_name} {user.last_name}".strip()
    if not display_name:
        display_name = user.username or ""
    if not display_name and user.email:
        display_name = user.email.split("@", 1)[0]

    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": display_name,
        "avatar": avatar_url,
    })
def neighbours_list(request):
    qs = Profile.objects.all().annotate(
        rating_average=Avg("received_reviews__rating"),
        rating_count=Count("received_reviews"),
    )

    # Do not show the current user's own profile in neighbours list.
    if request.user.is_authenticated:
        qs = qs.exclude(user=request.user)
        blocked_me_user_ids = ChatBlock.objects.filter(blocked=request.user).values_list("blocker_id", flat=True)
        blocked_by_me_user_ids = ChatBlock.objects.filter(blocker=request.user).values_list("blocked_id", flat=True)
        qs = qs.exclude(user_id__in=blocked_me_user_ids).exclude(user_id__in=blocked_by_me_user_ids)

    # SEARCH
    search = request.GET.get("search")
    if search:
        qs = qs.filter(
            Q(name__icontains=search) |
            Q(city__icontains=search) |
            Q(about__icontains=search) |
            Q(profession__icontains=search)
        )

    neighbour_filters = parse_neighbour_filters(request)
    ranking_configs = normalize_neighbour_ranking_configs(
        list(ProfileRankingConfig.objects.filter(is_active=True).order_by("id"))
    )
    qs = apply_neighbour_hard_filters(qs, neighbour_filters, ranking_configs)

    ranked_rows = []
    for profile in qs:
        relevance_score, match_percentage = calculate_neighbour_relevance(profile, neighbour_filters, ranking_configs)
        completion_data = _calculate_profile_completion(profile)
        completion_percent = int(completion_data.get("percentage") or 0)
        rating_value = float(profile.rating_average or 0)

        ranked_rows.append({
            "profile": profile,
            "relevanceScore": float(relevance_score),
            "matchPercentage": int(match_percentage),
            "ratingAverage": rating_value,
            "profileCompletion": completion_percent,
            "createdAt": profile.created_at,
        })

    # 3-level sorting: relevance -> rating -> profile completion.
    ranked_rows.sort(
        key=lambda row: (
            -row["matchPercentage"],
            -row["ratingAverage"],
            -row["profileCompletion"],
            -(row["createdAt"].timestamp() if row["createdAt"] else 0),
            row["profile"].id,
        )
    )

    # PAGINATION
    page = int(request.GET.get("page", 1))
    paginator = Paginator(ranked_rows, 10)
    page_obj = paginator.get_page(page)

    # Собираем избранные соседи текущего пользователя
    favorite_profile_ids = set()
    if request.user.is_authenticated:
        try:
            favorite_profile_ids = set(request.user.profile.favorite_profiles.values_list('id', flat=True))
        except Exception:
            favorite_profile_ids = set()

    results = []
    for row in page_obj:
        p = row["profile"]
        results.append({
            "id": p.id,
            "avatar": p.avatar.url if p.avatar else None,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "city": p.city,
            "languages": p.languages,
            "profession": p.profession,
            "about": p.about,
            "smoking": p.smoking,
            "alcohol": p.alcohol,
            "pets": p.pets,
            "sleep_schedule": p.sleep_schedule,
            "gamer": p.gamer,
            "work_from_home": p.work_from_home,
            "verified": p.verified,
            "looking_for_housing": p.looking_for_housing,
            "with_children": p.with_children,
            "with_disability": p.with_disability,
            "pensioner": p.pensioner,
            "ratingAverage": float(p.rating_average or 0),
            "ratingCount": int(p.rating_count or 0),
            "is_favorite": p.id in favorite_profile_ids,
            "relevanceScore": row["relevanceScore"],
            "matchPercentage": row["matchPercentage"],
            "profileCompletion": row["profileCompletion"],
        })

    return JsonResponse({
        "count": paginator.count,
        "pages": paginator.num_pages,
        "total_pages": paginator.num_pages,
        "results": results,
    })

@require_http_methods(["GET"])
def neighbour_detail(request, profile_id):
    profile = get_object_or_404(Profile, id=profile_id)
    if request.user.is_authenticated:
        is_blocked_for_viewer = ChatBlock.objects.filter(
            blocker=profile.user,
            blocked=request.user,
        ).exists()
        if is_blocked_for_viewer:
            return JsonResponse({"detail": "Forbidden"}, status=403)
    include_contacts = request.GET.get("include_contacts") in ["1", "true", "yes"]

    target_residency = ListingResident.objects.select_related("listing").filter(profile=profile).first()
    can_remove_from_home = False
    if request.user.is_authenticated and target_residency:
        requester_profile, _ = Profile.objects.get_or_create(user=request.user)
        same_home_resident = ListingResident.objects.filter(
            listing=target_residency.listing,
            profile=requester_profile,
        ).exists()
        is_home_owner = target_residency.listing.owner_id == request.user.id
        can_remove_from_home = (same_home_resident or is_home_owner) and requester_profile.id != profile.id

    is_favorite = False
    can_review = False
    my_review = None
    requester_profile = None
    if request.user.is_authenticated:
        try:
            is_favorite = request.user.profile.favorite_profiles.filter(id=profile.id).exists()
        except Exception:
            is_favorite = False
        requester_profile, _ = Profile.objects.get_or_create(user=request.user)
        my_review = ProfileReview.objects.filter(reviewer=requester_profile, target=profile).first()
        can_review = requester_profile.id != profile.id and (
            are_profiles_co_residents(requester_profile, profile) or my_review is not None
        )

    review_stats = ProfileReview.objects.filter(target=profile).aggregate(
        average=Avg("rating"),
        count=Count("id"),
    )
    reviews_qs = ProfileReview.objects.filter(target=profile).select_related("reviewer__user").order_by("-updated_at")
    if requester_profile:
        viewer_reviews = list(reviews_qs.filter(reviewer=requester_profile))
        other_reviews = list(reviews_qs.exclude(reviewer=requester_profile))
        reviews = viewer_reviews + other_reviews
    else:
        reviews = list(reviews_qs)

    payload = {
        "id": profile.id,
        "userId": profile.user_id,
        "name": profile.name,
        "age": profile.age,
        "gender": profile.gender,
        "city": profile.city,
        "languages": profile.languages.split(",") if profile.languages else [],
        "profession": profile.profession,
        "instagram": profile.instagram,
        "facebook": profile.facebook,
        "about": profile.about,
        "smoking": profile.smoking,
        "alcohol": profile.alcohol,
        "pets": profile.pets,
        "sleep_schedule": profile.sleep_schedule,
        "noise_tolerance": profile.noise_tolerance,
        "gamer": profile.gamer,
        "work_from_home": profile.work_from_home,
        "cleanliness": profile.cleanliness,
        "introvert_extrovert": profile.introvert_extrovert,
        "guests_parties": profile.guests_parties,
        "preferred_gender": profile.preferred_gender,
        "preferred_age_range": profile.preferred_age_range,
        "verified": profile.verified,
        "looking_for_housing": profile.looking_for_housing,
        "avatar": request.build_absolute_uri(profile.avatar.url) if profile.avatar else None,
        "is_favorite": is_favorite,
        "canRemoveFromHome": can_remove_from_home,
        "ratingAverage": float(review_stats["average"] or 0),
        "ratingCount": review_stats["count"] or 0,
        "canReview": can_review,
        "myRating": my_review.rating if my_review else None,
        "myComment": my_review.comment if my_review else "",
        "reviews": [
            {
                "id": review.id,
                "rating": review.rating,
                "comment": review.comment,
                "reviewerId": review.reviewer_id,
                "reviewerName": review.reviewer.name or review.reviewer.user.username,
                "reviewerAvatar": request.build_absolute_uri(review.reviewer.avatar.url) if review.reviewer.avatar else None,
                "updatedAt": review.updated_at.isoformat(),
            }
            for review in reviews
        ],
    }

    if include_contacts and request.user.is_authenticated:
        payload["phone"] = profile.phone
        payload["email"] = profile.user.email
        payload["instagram"] = profile.instagram
        payload["facebook"] = profile.facebook

    gallery_qs = profile.gallery_photos.all()[:24]
    payload["coverPhoto"] = request.build_absolute_uri(profile.cover_photo.url) if profile.cover_photo else None
    payload["gallery"] = [
        {
            "id": p.id,
            "url": request.build_absolute_uri(p.image.url),
            "caption": (p.caption or "")[:200],
        }
        for p in gallery_qs
    ]

    co_residents = []
    if target_residency:
        for r in (
            ListingResident.objects.filter(listing=target_residency.listing)
            .exclude(profile_id=profile.id)
            .select_related("profile", "profile__user")
        ):
            p = r.profile
            co_residents.append(
                {
                    "id": p.id,
                    "name": (p.name or "").strip() or p.user.get_username(),
                    "avatar": request.build_absolute_uri(p.avatar.url) if p.avatar else None,
                    "age": p.age,
                }
            )
    payload["coResidents"] = co_residents

    return JsonResponse(payload)


def _profile_gallery_caption_ok(caption: str) -> bool:
    s = (caption or "").strip().lower()
    if "http://" in s or "https://" in s or "www." in s:
        return False
    return True


PROFILE_GALLERY_MAX = 24


@csrf_exempt
@login_required
@require_POST
def upload_profile_cover(request):
    if "cover" not in request.FILES:
        return JsonResponse({"detail": "No cover image"}, status=400)
    moderation = moderate_image(request.FILES["cover"])
    if moderation.violation:
        sanction = apply_moderation_strike_and_notify(
            user=request.user,
            reasons=moderation.reasons,
            source="profile_cover_upload",
            raw_scores=moderation.raw_scores,
            raw_labels=moderation.raw_labels,
            provider=getattr(moderation, "provider", "unknown"),
        )
        return JsonResponse(
            {
                "detail": "Cover rejected by moderation",
                "reasons": moderation.reasons,
                "strikes": sanction["strikes"],
                "banned": sanction["banned"],
            },
            status=403,
        )
    profile = request.user.profile
    profile.cover_photo = request.FILES["cover"]
    profile.save(update_fields=["cover_photo"])
    return JsonResponse(
        {
            "detail": "Cover uploaded",
            "coverPhoto": request.build_absolute_uri(profile.cover_photo.url),
        }
    )


@csrf_exempt
@login_required
@require_POST
def profile_gallery_add(request):
    if "image" not in request.FILES:
        return JsonResponse({"detail": "No image"}, status=400)
    profile = request.user.profile
    if ProfileGalleryPhoto.objects.filter(profile=profile).count() >= PROFILE_GALLERY_MAX:
        return JsonResponse({"detail": "Gallery limit reached"}, status=400)
    caption = str(request.POST.get("caption") or "").strip()[:200]
    if not _profile_gallery_caption_ok(caption):
        return JsonResponse({"detail": "Caption cannot contain links"}, status=400)
    moderation = moderate_image(request.FILES["image"])
    if moderation.violation:
        sanction = apply_moderation_strike_and_notify(
            user=request.user,
            reasons=moderation.reasons,
            source="profile_gallery_upload",
            raw_scores=moderation.raw_scores,
            raw_labels=moderation.raw_labels,
            provider=getattr(moderation, "provider", "unknown"),
        )
        return JsonResponse(
            {
                "detail": "Image rejected by moderation",
                "reasons": moderation.reasons,
                "strikes": sanction["strikes"],
                "banned": sanction["banned"],
            },
            status=403,
        )
    next_order = (
        ProfileGalleryPhoto.objects.filter(profile=profile).aggregate(Max("sort_order"))["sort_order__max"] or 0
    ) + 1
    photo = ProfileGalleryPhoto.objects.create(
        profile=profile,
        image=request.FILES["image"],
        caption=caption,
        sort_order=next_order,
    )
    return JsonResponse(
        {
            "id": photo.id,
            "url": request.build_absolute_uri(photo.image.url),
            "caption": photo.caption or "",
        },
        status=201,
    )


@csrf_exempt
@login_required
@require_http_methods(["DELETE", "PATCH", "POST"])
def profile_gallery_item(request, photo_id):
    profile = request.user.profile
    photo = get_object_or_404(ProfileGalleryPhoto, id=photo_id, profile=profile)
    if request.method == "DELETE":
        photo.image.delete(save=False)
        photo.delete()
        return JsonResponse({"detail": "Deleted"})
    # PATCH caption (JSON or form)
    try:
        data = json.loads(request.body or "{}")
    except Exception:
        data = {}
    caption = str(data.get("caption") if isinstance(data.get("caption"), str) else request.POST.get("caption") or "").strip()[:200]
    if not _profile_gallery_caption_ok(caption):
        return JsonResponse({"detail": "Caption cannot contain links"}, status=400)
    photo.caption = caption
    photo.save(update_fields=["caption"])
    return JsonResponse({"id": photo.id, "caption": photo.caption})


@login_required
@require_POST
def submit_profile_review(request, profile_id):
    target_profile = get_object_or_404(Profile, id=profile_id)
    reviewer_profile, _ = Profile.objects.get_or_create(user=request.user)

    if target_profile.id == reviewer_profile.id:
        return JsonResponse({"detail": "Cannot review yourself"}, status=400)

    try:
        data = json.loads(request.body or "{}")
    except Exception:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "Rating must be an integer from 1 to 5"}, status=400)

    if rating < 1 or rating > 5:
        return JsonResponse({"detail": "Rating must be between 1 and 5"}, status=400)

    review = ProfileReview.objects.filter(reviewer=reviewer_profile, target=target_profile).first()

    if review is None and not are_profiles_co_residents(reviewer_profile, target_profile):
        return JsonResponse({"detail": "Only co-residents can review"}, status=403)

    if review is None:
        review = ProfileReview.objects.create(
            reviewer=reviewer_profile,
            target=target_profile,
            rating=rating,
            comment=comment,
        )
    else:
        review.rating = rating
        review.comment = comment
        review.save(update_fields=["rating", "comment", "updated_at"])

    stats = ProfileReview.objects.filter(target=target_profile).aggregate(
        average=Avg("rating"),
        count=Count("id"),
    )

    return JsonResponse({
        "detail": "Review saved",
        "review": {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "updatedAt": review.updated_at.isoformat(),
        },
        "ratingAverage": float(stats["average"] or 0),
        "ratingCount": stats["count"] or 0,
    })


@login_required
@require_POST
def remove_from_home(request, profile_id):
    target_profile = get_object_or_404(Profile, id=profile_id)
    requester_profile, _ = Profile.objects.get_or_create(user=request.user)

    if target_profile.id == requester_profile.id:
        return JsonResponse({"detail": "Use leave-home endpoint for yourself"}, status=400)

    target_residency = ListingResident.objects.select_related("listing").filter(profile=target_profile).first()
    if not target_residency:
        return JsonResponse({"detail": "Target is not in home"}, status=404)

    listing = target_residency.listing
    same_home_resident = ListingResident.objects.filter(listing=listing, profile=requester_profile).exists()
    is_home_owner = listing.owner_id == request.user.id

    if not (same_home_resident or is_home_owner):
        return JsonResponse({"detail": "Forbidden"}, status=403)

    if ListingResident.objects.filter(listing=listing).count() <= 1:
        return JsonResponse({"detail": "Cannot remove sole resident"}, status=400)

    target_residency.delete()
    return JsonResponse({"detail": "Removed from home"})

@csrf_exempt
@require_POST
def logout_view(request):
    logout(request)
    response = JsonResponse({"detail": "Logged out"})
    response.delete_cookie("sessionid")
    response.delete_cookie("csrftoken")
    return response
@csrf_exempt
def contact_view(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
    except:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    name = data.get("name")
    email = data.get("email")
    message = data.get("message")

    if not name or not email or not message:
        return JsonResponse({"detail": "All fields are required"}, status=400)

    full_message = f"""
New contact message from FlatFly:

Name: {name}
Email: {email}

Message:
{message}
    """

    send_mail(
        subject="FlatFly – New Contact Message",
        message=full_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=["raymannn34@gmail.com"],  # твоя рабочая почта
        fail_silently=False,
    )

    return JsonResponse({"detail": "Message sent successfully"})
@csrf_exempt
def password_reset_request(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    email = request.POST.get("email")
    if not email:
        return JsonResponse({"detail": "Email is required"}, status=400)
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # В целях безопасности не говорим, что пользователя нет
        return JsonResponse({
            "detail": "If an account with this email exists, a reset link was sent."
        })
    # Генерация токена
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend_url = get_frontend_url(request)
    reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"
    send_mail(
        subject="Password reset",
        message=f"Click the link to reset your password:\n\n{reset_link}",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
    return JsonResponse({
        "detail": "Password reset email sent"
    })
def get_frontend_url(request):
    origin = request.headers.get("Origin")
    if origin:
        return origin

    # fallback, если Origin нет (редко, но бывает)
    scheme = "https" if request.is_secure() else "http"
    host = request.get_host()
    return f"{scheme}://{host}"
@csrf_exempt
def password_reset_confirm(request, uidb64, token):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except:
        return JsonResponse({"detail": "Invalid link"}, status=400)
    if not default_token_generator.check_token(user, token):
        return JsonResponse({"detail": "Invalid or expired token"}, status=400)
    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)
    password = data.get("password")
    if not password:
        return JsonResponse({"detail": "Password required"}, status=400)
    user.set_password(password)
    user.save()
    return JsonResponse({"status": "password_updated"})

@csrf_exempt
def register_view(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    data = json.loads(request.body)

    name = data.get("name", "").strip()
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    if not name or not email or not password:
        return JsonResponse({"error": "Missing required fields"}, status=400)

    existing_user = User.objects.filter(email=email).first()
    if existing_user:
        profile = getattr(existing_user, "profile", None)

        if profile and profile.auth_provider == "google":
            return JsonResponse({
                "error": "This account was created using Google. Please log in with Google."
            }, status=400)

        return JsonResponse({
            "error": "User with this email already exists. Please log in."
        }, status=400)

    # создаём пользователя
    username = email.split("@")[0]
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )

    # профиль УЖЕ СОЗДАЛСЯ сигналом → просто получаем его
    profile = user.profile
    profile.name = name
    profile.auth_provider = "email"
    profile.save()

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return JsonResponse({
        "status": "registered",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": profile.name,
            "auth_provider": profile.auth_provider,
        }
    })
@csrf_exempt
def login_view(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Method not allowed"}, status=405)

    data = json.loads(request.body)
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return JsonResponse({"error": "Email and password are required"}, status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        return JsonResponse({"error": "User not found"}, status=400)

    profile = user.profile

    if not user.is_active:
        return JsonResponse({
            "error": "Account is blocked"
        }, status=403)

    # Если аккаунт Google
    if profile.auth_provider == "google":
        return JsonResponse({
            "error": "This account was created via Google. Please login with Google."
        }, status=400)

    # Проверяем пароль
    if not user.check_password(password):
        return JsonResponse({"error": "Invalid password"}, status=400)

    # Логиним
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return JsonResponse({
        "status": "logged_in",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": profile.name or user.first_name,
            "auth_provider": profile.auth_provider,
        }
    })

@csrf_exempt
@require_http_methods(["GET", "PUT", "PATCH", "DELETE"])
def listing_detail(request, listing_id):
    listing = get_object_or_404(Listing, id=listing_id)

    can_manage = False
    if request.user.is_authenticated:
        profile, _ = Profile.objects.get_or_create(user=request.user)
        can_manage = listing.owner_id == request.user.id or ListingResident.objects.filter(listing=listing, profile=profile).exists()

    if request.method in ["PUT", "PATCH", "DELETE"]:
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Not authenticated"}, status=401)

        if not can_manage:
            return JsonResponse({"detail": "Forbidden"}, status=403)

        if request.method == "DELETE":
            delete_listing_from_channel(listing, clear_fields=False)
            listing.delete()
            return JsonResponse({"detail": "Deleted"})

        data = json.loads(request.body or "{}")
        was_active = bool(listing.is_active)

        if "city" in data or "region" in data:
            next_region = data.get("region", listing.region)
            next_city = data.get("city", listing.city)
            next_city_text = str(next_city or "").strip()

            if not next_city_text:
                return JsonResponse({"detail": "City is required"}, status=400)
            if not is_valid_municipality_name(next_city_text, next_region):
                return JsonResponse({"detail": "City must be selected from Czech municipality list"}, status=400)
        editable_fields = {
            "title": "title",
            "description": "description",
            "type": "type",
            "property_type": "type",
            "region": "region",
            "city": "city",
            "address": "address",
            "geoLat": "geo_lat",
            "geoLng": "geo_lng",
            "geo_lat": "geo_lat",
            "geo_lng": "geo_lng",
            "price": "price",
            "deposit": "deposit",
            "currency": "currency",
            "preferredGender": "preferred_gender",
            "preferred_gender": "preferred_gender",
            "rooms": "rooms",
            "beds": "beds",
            "size": "size",
            "moveInDate": "move_in_date",
            "move_in_date": "move_in_date",
            "conditionState": "condition_state",
            "condition_state": "condition_state",
            "energyClass": "energy_class",
            "energy_class": "energy_class",
            "rentalPeriod": "rental_period",
            "rental_period": "rental_period",
            "maxResidents": "max_residents",
            "max_residents": "max_residents",
            "utilitiesFee": "utilities_fee",
            "utilities_fee": "utilities_fee",
            "utilitiesIncluded": "utilities_included",
            "utilities_included": "utilities_included",
            "internet": "internet",
            "petsAllowed": "pets_allowed",
            "pets_allowed": "pets_allowed",
            "smokingAllowed": "smoking_allowed",
            "smoking_allowed": "smoking_allowed",
            "amenities": "amenities",
            "hasRoommates": "has_roommates",
            "has_roommates": "has_roommates",
            "hasBusStop": "has_bus_stop",
            "has_bus_stop": "has_bus_stop",
            "hasTrainStation": "has_train_station",
            "has_train_station": "has_train_station",
            "hasMetro": "has_metro",
            "has_metro": "has_metro",
            "hasPostOffice": "has_post_office",
            "has_post_office": "has_post_office",
            "hasAtm": "has_atm",
            "has_atm": "has_atm",
            "hasGeneralPractitioner": "has_general_practitioner",
            "has_general_practitioner": "has_general_practitioner",
            "hasVet": "has_vet",
            "has_vet": "has_vet",
            "hasPrimarySchool": "has_primary_school",
            "has_primary_school": "has_primary_school",
            "hasKindergarten": "has_kindergarten",
            "has_kindergarten": "has_kindergarten",
            "hasSupermarket": "has_supermarket",
            "has_supermarket": "has_supermarket",
            "hasSmallShop": "has_small_shop",
            "has_small_shop": "has_small_shop",
            "hasRestaurant": "has_restaurant",
            "has_restaurant": "has_restaurant",
            "hasPlayground": "has_playground",
            "has_playground": "has_playground",
            "isActive": "is_active",
            "is_active": "is_active",
        }

        for incoming_key, model_field in editable_fields.items():
            if incoming_key not in data:
                continue

            value = data[incoming_key]
            if model_field in ["rooms", "size", "max_residents"]:
                value = parse_int_value(value)
            elif model_field == "beds":
                value = parse_int_value(value)
            elif model_field == "move_in_date":
                value = parse_date_safe(value)
            elif model_field in ["utilities_fee", "deposit"]:
                value = parse_decimal_value(value, Decimal("0"))
            elif model_field in ["geo_lat", "geo_lng"]:
                value = parse_decimal_value(value, None)
            elif model_field in [
                "utilities_included",
                "internet",
                "pets_allowed",
                "smoking_allowed",
                "has_roommates",
                "has_bus_stop",
                "has_train_station",
                "has_metro",
                "has_post_office",
                "has_atm",
                "has_general_practitioner",
                "has_vet",
                "has_primary_school",
                "has_kindergarten",
                "has_supermarket",
                "has_small_shop",
                "has_restaurant",
                "has_playground",
            ]:
                if isinstance(value, str):
                    value = value.strip().lower() in ["1", "true", "yes", "on"]
                else:
                    value = bool(value)
            elif model_field == "rental_period":
                value = str(value).upper() if value else "LONG"
                if value not in ["SHORT", "LONG", "BOTH"]:
                    value = "LONG"
            elif model_field == "preferred_gender":
                value = _normalize_preferred_gender(value, "any")
            elif model_field == "amenities":
                value = value if isinstance(value, list) else []
            elif model_field == "is_active":
                if isinstance(value, str):
                    value = value.strip().lower() in ["1", "true", "yes", "on"]
                else:
                    value = bool(value)

            setattr(listing, model_field, value)

        if listing.utilities_included:
            listing.utilities_fee = Decimal("0")

        if listing.geo_lat is None or listing.geo_lng is None:
            resolved_lat, resolved_lng = resolve_street_coordinates(listing.address, listing.city, listing.region)
            if resolved_lat is not None and resolved_lng is not None:
                listing.geo_lat = resolved_lat
                listing.geo_lng = resolved_lng

        listing.save()
        if was_active and not listing.is_active:
            delete_listing_from_channel(listing, clear_fields=True)
        elif (not was_active) and listing.is_active:
            _run_in_background("listing-publish", _publish_listing_to_channel_async, listing.id, False)
        return JsonResponse({"detail": "Updated"})

    ordered_images = get_ordered_listing_images(listing)
    main_image = ordered_images.first()

    # Признак избранного для текущего пользователя
    is_favorite = False
    if request.user.is_authenticated:
        try:
            is_favorite = request.user.profile.favorite_listings.filter(id=listing.id).exists()
        except Exception:
            is_favorite = False

    return JsonResponse({
        "id": listing.id,
        "type": normalize_listing_type(listing.type),
        "title": _safe_listing_title(listing),
        "description": _safe_listing_description(listing),
        "price": str(listing.price),
        "deposit": str(listing.deposit),
        "currency": listing.currency,
        "preferredGender": listing.preferred_gender,
        "region": listing.region,
        "city": listing.city,
        "address": listing.address,
        "geo_lat": float(listing.geo_lat) if listing.geo_lat is not None else None,
        "geo_lng": float(listing.geo_lng) if listing.geo_lng is not None else None,
        "size": listing.size,
        "rooms": listing.rooms,
        "beds": listing.beds,
        "condition_state": listing.condition_state,
        "rental_period": listing.rental_period,
        "move_in_date": listing.move_in_date.isoformat() if listing.move_in_date else None,
        "amenities": listing.amenities or [],
        "internet": listing.internet,
        "utilities_included": listing.utilities_included,
        "pets_allowed": listing.pets_allowed,
        "smoking_allowed": listing.smoking_allowed,
        "has_bus_stop": listing.has_bus_stop,
        "has_train_station": listing.has_train_station,
        "has_metro": listing.has_metro,
        "has_post_office": listing.has_post_office,
        "has_atm": listing.has_atm,
        "has_general_practitioner": listing.has_general_practitioner,
        "has_vet": listing.has_vet,
        "has_primary_school": listing.has_primary_school,
        "has_kindergarten": listing.has_kindergarten,
        "has_supermarket": listing.has_supermarket,
        "has_small_shop": listing.has_small_shop,
        "has_restaurant": listing.has_restaurant,
        "has_playground": listing.has_playground,
        "has_roommates": listing.has_roommates,
        "has_video": listing.has_video,
        "has_3d_tour": listing.has_3d_tour,
        "has_floorplan": listing.has_floorplan,
        "maxResidents": listing.max_residents,
        "utilitiesFee": str(listing.utilities_fee),
        "residentsCount": listing.residents.count(),
        "residents": [
            {
                "profileId": resident.profile_id,
                "name": resident.profile.name or resident.profile.user.username,
                "avatar": request.build_absolute_uri(resident.profile.avatar.url) if resident.profile.avatar else None,
            }
            for resident in ListingResident.objects.filter(listing=listing).select_related("profile__user")
        ],
        "isActive": listing.is_active,
        "canManage": can_manage,
        "badges": [],
        "image": request.build_absolute_uri(main_image.image.url) if main_image else None,
        "images": [request.build_absolute_uri(img.image.url) for img in ordered_images],
        "imageItems": [
            {
                "id": img.id,
                "url": request.build_absolute_uri(img.image.url),
                "isPrimary": bool(img.is_primary),
            }
            for img in ordered_images
        ],
        "is_favorite": is_favorite,
    })


@login_required
@require_POST
def report_listing(request, listing_id):
    listing = get_object_or_404(Listing, id=listing_id)
    try:
        data = json.loads(request.body or "{}")
    except Exception:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    reason = str(data.get("reason") or "").strip()
    details = str(data.get("details") or "").strip()
    allowed_reasons = {choice[0] for choice in ListingReport.REASON_CHOICES}
    if reason not in allowed_reasons:
        return JsonResponse({"detail": "Invalid reason"}, status=400)

    if listing.owner_id == request.user.id:
        return JsonResponse({"detail": "You cannot report your own listing"}, status=400)

    report = ListingReport.objects.create(
        listing=listing,
        reporter=request.user,
        listing_owner=listing.owner if listing.owner_id else request.user,
        reason=reason,
        details=details,
    )
    return JsonResponse({"detail": "Report submitted", "report_id": report.id}, status=201)
@csrf_exempt
@require_http_methods(["GET", "POST"])
def listings_view(request):

    # =========================
    # СОЗДАНИЕ ОБЪЯВЛЕНИЯ
    # =========================
    if request.method == "POST":
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Not authenticated"}, status=401)

        data = json.loads(request.body or "{}")

        profile, _ = Profile.objects.get_or_create(user=request.user)

        if ListingResident.objects.filter(profile=profile).exclude(listing__owner=request.user).exists():
            return JsonResponse({"detail": "You already belong to a home"}, status=400)

        role_raw = data.get("creatorRole", data.get("role"))
        role = str(role_raw).upper() if role_raw is not None else ""
        if role not in ["OWNER", "NEIGHBOUR"]:
            return JsonResponse({"detail": "Creator role must be OWNER or NEIGHBOUR"}, status=400)

        owner_user = request.user if role == "OWNER" else None

        region_value = data.get("region")
        if not region_value or region_value in ["ALL", "ALL_CR"]:
            return JsonResponse({"detail": "Region is required"}, status=400)

        city_value = str(data.get("city") or "").strip()
        if not city_value:
            return JsonResponse({"detail": "City is required"}, status=400)
        if not is_valid_municipality_name(city_value, region_value):
            return JsonResponse({"detail": "City must be selected from Czech municipality list"}, status=400)

        rooms_value = parse_int_value(data.get("rooms"))
        size_value = parse_int_value(data.get("size"))

        if rooms_value is None and isinstance(data.get("rooms"), str):
            raw_rooms = data.get("rooms", "")
            if re.search(r"m\s*2|m²|\bм\b|\bm\b", raw_rooms.lower()) and size_value is None:
                size_value = parse_int_value(raw_rooms)

        max_residents_value = parse_int_value(data.get("maxResidents"))
        if max_residents_value is None:
            max_residents_value = 1
        max_residents_value = max(1, min(6, max_residents_value))

        utilities_included_value = bool(
            data.get("utilitiesIncluded", data.get("utilities_included", data.get("utilities", False)))
        )
        utilities_fee_value = parse_decimal_value(
            data.get("utilitiesFee", data.get("utilities_fee", 0)),
            Decimal("0"),
        )
        deposit_value = parse_decimal_value(
            data.get("deposit", data.get("depositAmount", 0)),
            Decimal("0"),
        )
        if utilities_included_value:
            utilities_fee_value = Decimal("0")

        listing = Listing.objects.create(
            owner=owner_user,
            type=data.get("type") or data.get("property_type") or "APARTMENT",
            title=data.get("title"),
            description=data.get("description"),
            # Draft until at least one image passes moderation (see upload_listing_image).
            is_active=False,

            region=region_value,
            city=city_value,
            address=data.get("address", ""),
            geo_lat=parse_decimal_value(data.get("geo_lat", data.get("geoLat")), None),
            geo_lng=parse_decimal_value(data.get("geo_lng", data.get("geoLng")), None),

            price=data.get("price"),
            currency=data.get("currency", "CZK"),
            preferred_gender=_normalize_preferred_gender(data.get("preferredGender", data.get("preferred_gender")), "any"),
            rooms=rooms_value,
            beds=parse_int_value(data.get("beds")),
            size=size_value,

            has_roommates=bool(data.get("hasRoommates", data.get("has_roommates", False))),
            rental_period=(data.get("rentalPeriod") or data.get("rental_period") or "LONG").upper(),

            internet=bool(data.get("internet", False)),
            utilities_included=utilities_included_value,
            pets_allowed=bool(data.get("petsAllowed", data.get("pets_allowed", False))),
            smoking_allowed=bool(data.get("smokingAllowed", data.get("smoking_allowed", False))),

            amenities=data.get("amenities", []),

            move_in_date=parse_date_safe(data.get("moveInDate") or data.get("move_in_date")),
            condition_state=data.get("conditionState") or data.get("condition_state") or None,
            energy_class=data.get("energyClass") or data.get("energy_class") or None,

            has_bus_stop=bool(data.get("hasBusStop", data.get("has_bus_stop", False))),
            has_train_station=bool(data.get("hasTrainStation", data.get("has_train_station", False))),
            has_metro=bool(data.get("hasMetro", data.get("has_metro", False))),
            has_post_office=bool(data.get("hasPostOffice", data.get("has_post_office", False))),
            has_atm=bool(data.get("hasAtm", data.get("has_atm", False))),
            has_general_practitioner=bool(data.get("hasGeneralPractitioner", data.get("has_general_practitioner", False))),
            has_vet=bool(data.get("hasVet", data.get("has_vet", False))),
            has_primary_school=bool(data.get("hasPrimarySchool", data.get("has_primary_school", False))),
            has_kindergarten=bool(data.get("hasKindergarten", data.get("has_kindergarten", False))),
            has_supermarket=bool(data.get("hasSupermarket", data.get("has_supermarket", False))),
            has_small_shop=bool(data.get("hasSmallShop", data.get("has_small_shop", False))),
            has_restaurant=bool(data.get("hasRestaurant", data.get("has_restaurant", False))),
            has_playground=bool(data.get("hasPlayground", data.get("has_playground", False))),

            max_residents=max_residents_value,
            utilities_fee=utilities_fee_value,
            deposit=deposit_value,
        )

        if listing.geo_lat is None or listing.geo_lng is None:
            _run_in_background("listing-geocode", _resolve_listing_coordinates_async, listing.id)

        # Guard against DB integrity errors when profile already has a residency.
        existing_residency = ListingResident.objects.filter(profile=profile).first()
        if existing_residency and existing_residency.listing_id != listing.id:
            return JsonResponse({"detail": "You already belong to a home"}, status=400)

        ListingResident.objects.get_or_create(listing=listing, profile=profile)

        return JsonResponse({
            "id": listing.id,
            "status": "created"
        })


    # =========================
    # ПОЛУЧЕНИЕ СПИСКА
    # =========================
    owner_filter = request.GET.get("owner")
    if owner_filter == "me":
        if not request.user.is_authenticated:
            return JsonResponse({"detail": "Not authenticated"}, status=401)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        qs = Listing.objects.filter(
            Q(owner=request.user) | Q(residents__profile=profile)
        ).exclude(type="NEIGHBOUR").distinct().order_by("-created_at")
    else:
        qs = Listing.objects.filter(is_active=True).exclude(type="NEIGHBOUR").order_by("-created_at")

    filter_configs = list(ListingFilterConfig.objects.filter(enabled=True))
    config_by_code = {cfg.code: cfg for cfg in filter_configs}
    option_configs = list(
        ListingFilterOptionConfig.objects.filter(
            enabled=True,
            parent_filter__code__in=["amenities", "infrastructure"],
        ).select_related("parent_filter")
    )
    option_configs_by_parent = {"amenities": {}, "infrastructure": {}}
    for option_cfg in option_configs:
        parent_code = option_cfg.parent_filter.code
        option_configs_by_parent.setdefault(parent_code, {})[option_cfg.option_key] = option_cfg

    requested_filters = _build_requested_listing_filters(request)

    # Получаем фильтры
    search = request.GET.get("search")
    Type = request.GET.get("type")

    # ---- Фильтрация ----

    if Type:
        normalized_page_type = normalize_listing_type(Type)
        if normalized_page_type == "APARTMENT":
            qs = qs.filter(type__in=["APARTMENT", "BYT", "DUM"])
        else:
            qs = qs.filter(type=normalized_page_type)

    if search:
        qs = qs.filter(
            Q(title__icontains=search) |
            Q(description__icontains=search)
        )

    histogram_filters = dict(requested_filters)
    histogram_filters["price_from"] = None
    histogram_filters["price_to"] = None
    histogram_qs = _apply_hard_filters(qs, histogram_filters, config_by_code, option_configs_by_parent)
    price_histogram = _build_price_histogram(histogram_qs)

    qs = _apply_hard_filters(qs, requested_filters, config_by_code, option_configs_by_parent)
    qs = qs.prefetch_related(
        Prefetch(
            "images",
            queryset=ListingImage.objects.order_by("-is_primary", "id"),
        )
    )

    ranked_items = []
    for listing in qs:
        score_value, match_percent = _calculate_listing_score(listing, requested_filters, config_by_code, option_configs_by_parent)
        ranked_items.append((listing, score_value, match_percent))

    selected_sort = str(requested_filters.get("sort_by") or "price_asc").strip().lower()
    allowed_sort_modes = {
        "price_asc",
        "price_desc",
        "date_desc",
        "date_asc",
        "distance_university",
        "distance_work",
        "distance_optimal",
    }
    if selected_sort not in allowed_sort_modes:
        selected_sort = "price_asc"

    profile_university_point = None
    profile_work_point = None
    if selected_sort in {"distance_university", "distance_work", "distance_optimal"} and request.user.is_authenticated:
        profile, _ = Profile.objects.get_or_create(user=request.user)
        university = profile.university

        if university and university.latitude is not None and university.longitude is not None:
            profile_university_point = (float(university.latitude), float(university.longitude))

        work_lat = _parse_float_safe(profile.location_latitude)
        work_lng = _parse_float_safe(profile.location_longitude)
        if work_lat is not None and work_lng is not None:
            profile_work_point = (work_lat, work_lng)

    if selected_sort in {"distance_university", "distance_work", "distance_optimal"}:
        ranking_with_distance = []
        for listing, score_value, match_percent in ranked_items:
            listing_lat = _parse_float_safe(listing.geo_lat)
            listing_lng = _parse_float_safe(listing.geo_lng)

            listing_point = None
            if listing_lat is not None and listing_lng is not None:
                listing_point = (listing_lat, listing_lng)

            university_distance = _haversine_distance_km(listing_point, profile_university_point)
            work_distance = _haversine_distance_km(listing_point, profile_work_point)

            if selected_sort == "distance_university":
                secondary_metric = university_distance if university_distance is not None else float("inf")
            elif selected_sort == "distance_work":
                secondary_metric = work_distance if work_distance is not None else float("inf")
            else:
                if university_distance is not None and work_distance is not None:
                    secondary_metric = university_distance + work_distance
                elif university_distance is not None:
                    secondary_metric = university_distance
                elif work_distance is not None:
                    secondary_metric = work_distance
                else:
                    secondary_metric = float("inf")

            ranking_with_distance.append((listing, score_value, match_percent, secondary_metric))

        ranked_items = sorted(
            ranking_with_distance,
            key=lambda item: (
                -float(item[1]),
                float(item[3]),
                float(item[0].price),
                -item[0].created_at.timestamp(),
            ),
        )

    elif selected_sort == "price_desc":
        # Primary: relevance, secondary: price high->low, tertiary: newer first.
        ranked_items.sort(
            key=lambda item: (-float(item[1]), -float(item[0].price), -item[0].created_at.timestamp()),
        )
    elif selected_sort == "date_desc":
        # Primary: relevance, secondary: newer first, tertiary: cheaper first.
        ranked_items.sort(
            key=lambda item: (-float(item[1]), -item[0].created_at.timestamp(), float(item[0].price)),
        )
    elif selected_sort == "date_asc":
        # Primary: relevance, secondary: older first, tertiary: cheaper first.
        ranked_items.sort(
            key=lambda item: (-float(item[1]), item[0].created_at.timestamp(), float(item[0].price)),
        )
    else:
        # Default: primary relevance, secondary price low->high, tertiary newer first.
        ranked_items.sort(
            key=lambda item: (-float(item[1]), float(item[0].price), -item[0].created_at.timestamp()),
        )

    ranked_listings = [item[0] for item in ranked_items]
    listing_scores = {
        item[0].id: {
            "relevance_score": round(item[1], 4),
            "match_percentage": item[2],
        }
        for item in ranked_items
    }

    # ---- Пагинация ----

    paginator = Paginator(ranked_listings, 10)
    page_number = request.GET.get("page", 1)
    page_obj = paginator.get_page(page_number)

    # Собираем избранные id для текущего пользователя (если залогинен)
    favorite_ids = set()
    if request.user.is_authenticated:
        try:
            favorite_ids = set(request.user.profile.favorite_listings.values_list('id', flat=True))
        except Exception:
            favorite_ids = set()

    results = []
    for listing in page_obj:
        main_image = get_primary_listing_image(listing)
        ranking_data = listing_scores.get(listing.id, {"relevance_score": 0.0, "match_percentage": 0})
        preview_images = list(listing.images.all())[:4]
        image_list_urls = [request.build_absolute_uri(img.image.url) for img in preview_images]

        results.append({
            "id": listing.id,
            "type": normalize_listing_type(listing.type),
            "title": _safe_listing_title(listing),
            "price": str(listing.price),
            "currency": listing.currency,
            "deposit": str(listing.deposit),
            "utilitiesFee": str(listing.utilities_fee),
            "isActive": listing.is_active,
            "region": listing.region,
            "city": listing.city,
            "address": listing.address,
            "size": listing.size,
            "rooms": listing.rooms,
            "beds": listing.beds,
            "maxResidents": listing.max_residents,
            "residentsCount": listing.residents.count(),

            "hasRoommates": listing.has_roommates,
            "rentalPeriod": listing.rental_period,
            "preferredGender": listing.preferred_gender,

            "internet": listing.internet,
            "utilities": listing.utilities_included,
            "petsAllowed": listing.pets_allowed,
            "smokingAllowed": listing.smoking_allowed,

            "amenities": listing.amenities,
            "moveInDate": listing.move_in_date,
            "relevanceScore": ranking_data["relevance_score"],
            "matchPercentage": ranking_data["match_percentage"],

            "image": request.build_absolute_uri(main_image.image.url) if main_image else None,
            "images": image_list_urls,
            "is_favorite": listing.id in favorite_ids,
        })

    return JsonResponse({
        "results": results,
        "total_pages": paginator.num_pages,
        "total_count": paginator.count,
        "current_page": page_obj.number,
        "price_histogram": price_histogram,
    })


def parse_date_safe(value):
    """
    Безопасный парсер даты из строки YYYY-MM-DD
    """
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def parse_int_value(value):
    if value is None or value == "":
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        match = re.search(r"\d+", value)
        if not match:
            return None
        return int(match.group(0))
    return None


def parse_decimal_value(value, fallback=Decimal("0")):
    if value is None or value == "":
        return fallback
    try:
        return Decimal(str(value).replace(",", "."))
    except (InvalidOperation, TypeError, ValueError):
        return fallback


@login_required
@require_POST
def create_home_invite(request, listing_id):
    listing = get_object_or_404(Listing, id=listing_id)
    profile, _ = Profile.objects.get_or_create(user=request.user)

    is_resident = ListingResident.objects.filter(listing=listing, profile=profile).exists()
    if not is_resident:
        return JsonResponse({"detail": "Only residents can create invite"}, status=403)

    invite = ListingInvite.objects.create(
        listing=listing,
        token=uuid.uuid4().hex,
        created_by=profile,
        expires_at=timezone.now() + timedelta(days=7),
    )
    return JsonResponse({
        "token": invite.token,
        "inviteUrl": f"/api/listings/invite/{invite.token}/join/",
        "expiresAt": invite.expires_at.isoformat(),
    })


@login_required
@require_http_methods(["GET", "POST"])
def join_home_by_invite(request, token):
    invite = get_object_or_404(ListingInvite, token=token)

    def joined_redirect_response():
        return redirect("/profile?tab=myHome&joined=1")

    if not invite.is_active:
        return JsonResponse({"detail": "Invite inactive"}, status=400)
    if invite.expires_at <= timezone.now():
        return JsonResponse({"detail": "Invite expired"}, status=400)

    profile, _ = Profile.objects.get_or_create(user=request.user)

    if ListingResident.objects.filter(profile=profile).exclude(listing=invite.listing).exists():
        return JsonResponse({"detail": "Already resident in another home"}, status=400)

    if ListingResident.objects.filter(listing=invite.listing, profile=profile).exists():
        if request.method == "GET":
            return joined_redirect_response()
        return JsonResponse({"detail": "Already joined"}, status=200)

    current_count = ListingResident.objects.filter(listing=invite.listing).count()
    if current_count >= invite.listing.max_residents:
        return JsonResponse({"detail": "Home is full"}, status=400)

    ListingResident.objects.create(listing=invite.listing, profile=profile)
    invite.accepted_by = profile
    invite.accepted_at = timezone.now()
    invite.is_active = False
    invite.save(update_fields=["accepted_by", "accepted_at", "is_active"])

    if request.method == "GET":
        return joined_redirect_response()

    return JsonResponse({"detail": "Joined", "listingId": invite.listing_id})


@login_required
@require_http_methods(["GET"])
def my_home(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    resident = ListingResident.objects.select_related("listing").filter(profile=profile).first()
    if not resident:
        return JsonResponse({"detail": "Not in home", "listing": None})

    listing = resident.listing
    main_image = get_primary_listing_image(listing)
    residents = ListingResident.objects.filter(listing=listing).select_related("profile__user")

    return JsonResponse({
        "listing": {
            "id": listing.id,
            "title": _safe_listing_title(listing),
            "type": normalize_listing_type(listing.type),
            "image": request.build_absolute_uri(main_image.image.url) if main_image else None,
            "address": listing.address,
            "region": listing.region,
            "maxResidents": listing.max_residents,
            "residentsCount": residents.count(),
        },
        "residents": [
            {
                "profileId": r.profile_id,
                "name": r.profile.name or r.profile.user.username,
                "userId": r.profile.user_id,
                "avatar": request.build_absolute_uri(r.profile.avatar.url) if r.profile.avatar else None,
            }
            for r in residents
        ],
    })


@login_required
@require_POST
def leave_home(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)
    resident = ListingResident.objects.select_related("listing").filter(profile=profile).first()

    if not resident:
        return JsonResponse({"detail": "Not in any home"}, status=404)

    listing = resident.listing
    total_residents = ListingResident.objects.filter(listing=listing).count()
    if total_residents <= 1:
        if listing.owner_id == request.user.id:
            delete_listing_from_channel(listing, clear_fields=False)
            listing.delete()
            return JsonResponse({"detail": "Sole resident listing removed"})
        return JsonResponse({"detail": "Cannot leave as sole resident"}, status=400)

    resident.delete()
    return JsonResponse({"detail": "Left home"})
@csrf_exempt
@require_POST
def create_ad(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    data = json.loads(request.body)

    ad = Ad.objects.create(
        owner=request.user,
        type=data["type"],
        title=data["title"],
        description=data["description"],
        layout=data.get("layout", ""),
        beds=data.get("beds"),
        price=data["price"],
    )

    return JsonResponse({"id": ad.id})
@csrf_exempt
@require_POST
def upload_listing_image(request, listing_id):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    listing = get_object_or_404(Listing, id=listing_id)
    profile, _ = Profile.objects.get_or_create(user=request.user)
    can_manage = listing.owner_id == request.user.id or ListingResident.objects.filter(listing=listing, profile=profile).exists()
    if not can_manage:
        return JsonResponse({"detail": "Forbidden"}, status=403)

    if "image" not in request.FILES:
        return JsonResponse({"detail": "No image"}, status=400)

    moderation = moderate_image(request.FILES["image"])
    if moderation.violation:
        sanction = apply_moderation_strike_and_notify(
            user=request.user,
            reasons=moderation.reasons,
            source="listing_image_upload",
            raw_scores=moderation.raw_scores,
            raw_labels=moderation.raw_labels,
            provider=getattr(moderation, "provider", "unknown"),
            listing=listing,
        )
        listing_id = listing.id
        delete_listing_from_channel(listing, clear_fields=False)
        listing.delete()
        return JsonResponse(
            {
                "detail": "Image rejected by moderation",
                "reasons": moderation.reasons,
                "strikes": sanction["strikes"],
                "banned": sanction["banned"],
                "listingDeleted": True,
                "deletedListingId": listing_id,
            },
            status=403,
        )

    is_primary_raw = str(request.POST.get("is_primary", "")).strip().lower()
    is_primary = is_primary_raw in {"1", "true", "yes", "on"}

    if is_primary:
        ListingImage.objects.filter(listing=listing, is_primary=True).update(is_primary=False)

    if not is_primary and not ListingImage.objects.filter(listing=listing, is_primary=True).exists():
        is_primary = True

    img = ListingImage.objects.create(
        listing=listing,
        image=request.FILES["image"],
        is_primary=is_primary,
    )

    listing.is_active = True
    listing.save(update_fields=["is_active"])
    publish_now_raw = str(request.POST.get("publish_now", "")).strip().lower()
    publish_now = publish_now_raw in {"1", "true", "yes", "on"}
    if publish_now:
        _run_in_background("listing-publish-refresh", _publish_listing_to_channel_async, listing.id, True)

    return JsonResponse({
        "id": img.id,
        "url": img.image.url,
        "isPrimary": bool(img.is_primary),
    })

@csrf_exempt
@require_POST
def upload_avatar(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    if "avatar" not in request.FILES:
        return JsonResponse({"detail": "No avatar image"}, status=400)

    moderation = moderate_image(request.FILES["avatar"])
    if moderation.violation:
        sanction = apply_moderation_strike_and_notify(
            user=request.user,
            reasons=moderation.reasons,
            source="avatar_upload",
            raw_scores=moderation.raw_scores,
            raw_labels=moderation.raw_labels,
            provider=getattr(moderation, "provider", "unknown"),
        )
        return JsonResponse(
            {
                "detail": "Avatar rejected by moderation",
                "reasons": moderation.reasons,
                "strikes": sanction["strikes"],
                "banned": sanction["banned"],
            },
            status=403,
        )

    profile = request.user.profile
    profile.avatar = request.FILES["avatar"]
    profile.save()

    return JsonResponse({
        "detail": "Avatar uploaded",
        "avatar": profile.avatar.url
    })
@csrf_exempt
@require_http_methods(["GET", "POST"])
def profile_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    profile, _ = Profile.objects.get_or_create(user=request.user)

    if request.method == "GET":

        completion_data = _calculate_profile_completion(profile)

        gallery_own = profile.gallery_photos.all()[:24]
        return JsonResponse({
            "photo": profile.avatar.url if profile.avatar else "",
            "coverPhoto": profile.cover_photo.url if profile.cover_photo else "",
            "gallery": [
                {
                    "id": p.id,
                    "url": p.image.url,
                    "caption": (p.caption or "")[:200],
                }
                for p in gallery_own
            ],
            "name": profile.name,
            "phone": profile.phone,
            "age": profile.age,
            "gender": profile.gender,
            "city": profile.city,
            "locationRegion": profile.location_region,
            "locationCity": profile.location_city,
            "locationAddress": profile.location_address,
            "locationLat": float(profile.location_latitude) if profile.location_latitude is not None else None,
            "locationLng": float(profile.location_longitude) if profile.location_longitude is not None else None,
            "universityId": profile.university_id,
            "facultyId": profile.faculty_id,
            "universityName": profile.university.name if profile.university_id else "",
            "facultyName": profile.faculty.name if profile.faculty_id else "",
            "universityLat": float(profile.university.latitude) if profile.university_id and profile.university and profile.university.latitude is not None else None,
            "universityLng": float(profile.university.longitude) if profile.university_id and profile.university and profile.university.longitude is not None else None,
            "languages": profile.languages.split(",") if profile.languages else [],

            "profession": profile.profession,
            "instagram": profile.instagram,
            "facebook": profile.facebook,
            "about": profile.about,

            "smoking": profile.smoking,
            "alcohol": profile.alcohol,
            "sleepSchedule": profile.sleep_schedule,
            "noiseTolerance": profile.noise_tolerance,

            "gamer": profile.gamer,
            "workFromHome": profile.work_from_home,
            "pets": profile.pets,

            "cleanliness": profile.cleanliness,
            "introvertExtrovert": profile.introvert_extrovert,

            "guestsParties": profile.guests_parties,
            "preferredGender": profile.preferred_gender,
            "preferredAgeRange": profile.preferred_age_range,

            "verified": profile.verified,
            "lookingForHousing": profile.looking_for_housing,
            "withChildren": profile.with_children,
            "withDisability": profile.with_disability,
            "pensioner": profile.pensioner,
            "profileCompletion": completion_data,
        })

    # POST — обновляем ТОЛЬКО если поле пришло
    data = json.loads(request.body)

    for field, attr in [
        ("name", "name"),
        ("phone", "phone"),
        ("age", "age"),
        ("gender", "gender"),
        ("city", "city"),
        ("locationRegion", "location_region"),
        ("locationCity", "location_city"),
        ("locationAddress", "location_address"),
        ("languages", "languages"),
        ("profession", "profession"),
        ("instagram", "instagram"),
        ("facebook", "facebook"),
        ("about", "about"),
        ("smoking", "smoking"),
        ("alcohol", "alcohol"),
        ("sleepSchedule", "sleep_schedule"),
        ("noiseTolerance", "noise_tolerance"),
        ("gamer", "gamer"),
        ("workFromHome", "work_from_home"),
        ("pets", "pets"),
        ("cleanliness", "cleanliness"),
        ("introvertExtrovert", "introvert_extrovert"),
        ("guestsParties", "guests_parties"),
        ("preferredGender", "preferred_gender"),
        ("preferredAgeRange", "preferred_age_range"),
        ("verified", "verified"),
        ("lookingForHousing", "looking_for_housing"),
        ("withChildren", "with_children"),
        ("withDisability", "with_disability"),
        ("pensioner", "pensioner"),
    ]:
        if field in data:
            value = data[field]
            if field == "languages":
                value = ",".join(value)
            setattr(profile, attr, value)

    if "locationLat" in data:
        profile.location_latitude = _parse_float_safe(data.get("locationLat"))

    if "locationLng" in data:
        profile.location_longitude = _parse_float_safe(data.get("locationLng"))

    if "universityId" in data:
        university_id = data.get("universityId")
        if university_id in [None, "", 0, "0"]:
            profile.university = None
            profile.faculty = None
        else:
            try:
                selected_university = University.objects.get(id=int(university_id))
            except (ValueError, TypeError, University.DoesNotExist):
                return JsonResponse({"detail": "Invalid university"}, status=400)
            profile.university = selected_university

            # If university changed, clear faculty unless it still belongs to selected university.
            if profile.faculty_id and profile.faculty.university_id != selected_university.id:
                profile.faculty = None

    if "facultyId" in data:
        faculty_id = data.get("facultyId")
        if faculty_id in [None, "", 0, "0"]:
            profile.faculty = None
        else:
            if not profile.university_id:
                return JsonResponse({"detail": "University must be selected before faculty"}, status=400)
            try:
                selected_faculty = UniversityFaculty.objects.get(id=int(faculty_id), university_id=profile.university_id)
            except (ValueError, TypeError, UniversityFaculty.DoesNotExist):
                return JsonResponse({"detail": "Invalid faculty for selected university"}, status=400)
            profile.faculty = selected_faculty

    profile.save()
    return JsonResponse({
        "detail": "Profile updated",
        "profileCompletion": _calculate_profile_completion(profile),
    })


@require_http_methods(["GET"])
def universities_list(request):
    query = str(request.GET.get("q") or "").strip()
    qs = University.objects.exclude(normalized_name__contains="fakulta").exclude(normalized_name__contains="faculty")

    if query:
        normalized = normalize_text(query)
        qs = qs.filter(
            Q(name__icontains=query)
            | Q(short_name__icontains=query)
            | Q(normalized_name__contains=normalized)
        )

    rows = qs.order_by("name").values("id", "name", "short_name", "city", "address", "latitude", "longitude")[:200]
    results = []
    for item in rows:
        lat = item.get("latitude")
        lng = item.get("longitude")
        results.append({
            "id": item.get("id"),
            "name": item.get("name"),
            "short_name": item.get("short_name"),
            "city": item.get("city"),
            "address": item.get("address"),
            "latitude": float(lat) if lat is not None else None,
            "longitude": float(lng) if lng is not None else None,
        })

    return JsonResponse({"results": results})


@require_http_methods(["GET"])
def university_faculties_list(request):
    university_id = request.GET.get("universityId")
    if not university_id:
        return JsonResponse({"results": []})

    try:
        university_id_int = int(university_id)
    except (TypeError, ValueError):
        return JsonResponse({"results": []})

    query = str(request.GET.get("q") or "").strip()
    qs = UniversityFaculty.objects.filter(university_id=university_id_int)

    if query:
        normalized = normalize_text(query)
        qs = qs.filter(
            Q(name__icontains=query) | Q(normalized_name__contains=normalized)
        )

    rows = qs.order_by("name").values("id", "name", "city", "address", "latitude", "longitude")[:300]
    results = []
    for item in rows:
        lat = item.get("latitude")
        lng = item.get("longitude")
        results.append({
            "id": item.get("id"),
            "name": item.get("name"),
            "city": item.get("city"),
            "address": item.get("address"),
            "latitude": float(lat) if lat is not None else None,
            "longitude": float(lng) if lng is not None else None,
        })

    return JsonResponse({"results": results})


def apple_callback(request):
    code = request.GET.get("code")
    id_token = request.GET.get("id_token")

    if not id_token:
        return HttpResponse("No id_token from Apple", status=400)

    payload = jwt.decode(id_token, options={"verify_signature": False})

    apple_id = payload.get("sub")
    email = payload.get("email")  # может быть relay
    first_name = payload.get("name", {}).get("firstName", "")
    last_name = payload.get("name", {}).get("lastName", "")

    # Ищем по email
    user = None
    if email:
        user = User.objects.filter(email=email).first()

    if user:
        profile = user.profile

        # Если раньше был email, апгрейдим
        if profile.auth_provider == "email":
            profile.auth_provider = "apple"
            profile.save()
    else:
        user = User.objects.create_user(
            username=f"apple_{apple_id}",
            email=email or "",
            first_name=first_name,
            last_name=last_name,
        )

        profile = Profile.objects.create(
            user=user,
            auth_provider="apple",
            name=f"{first_name} {last_name}".strip()
        )

    if not user.is_active:
        return HttpResponse("Account is blocked", status=403)

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return redirect("/apartments")


def _try_apply_google_avatar_photo(profile, picture_url):
    """Best-effort: save Google profile picture as avatar for new OAuth sign-ups."""
    if not picture_url:
        return
    url = str(picture_url).strip()
    if not url.startswith(("http://", "https://")):
        return
    if profile.avatar:
        return
    if "googleusercontent.com" in url:
        url = re.sub(r"=s\d+", "=s512", url, count=1)
    try:
        resp = requests.get(
            url,
            timeout=12,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; FlatFly/1.0; +https://flatfly.eu)",
            },
        )
        resp.raise_for_status()
        data = resp.content
        if not data or len(data) > 8 * 1024 * 1024:
            return
        upload = ContentFile(data)
        moderation = moderate_image(upload)
        if moderation.violation:
            return
        upload.seek(0)
        ct = (resp.headers.get("Content-Type") or "").lower()
        if "png" in ct:
            ext = ".png"
        elif "webp" in ct:
            ext = ".webp"
        elif "gif" in ct:
            ext = ".gif"
        else:
            ext = ".jpg"
        profile.avatar.save(f"google_oauth_{profile.pk}{ext}", upload, save=True)
    except Exception:
        return


def google_callback(request):
    error = request.GET.get("error")
    if error:
        return HttpResponse(f"Google OAuth error: {error}")

    code = request.GET.get("code")
    if not code:
        return HttpResponse("No code received", status=400)

    # 1. Получаем token
    token_response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        },
    )

    token_data = token_response.json()
    if "id_token" not in token_data:
        return HttpResponse("No id_token returned", status=400)

    # 2. Декодируем id_token
    payload = jwt.decode(token_data["id_token"], options={"verify_signature": False})

    email = payload.get("email")
    first_name = payload.get("given_name", "")
    last_name = payload.get("family_name", "")
    google_id = payload.get("sub")
    picture_url = payload.get("picture")
    access_token = token_data.get("access_token")
    if not picture_url and access_token:
        try:
            uir = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            if uir.ok:
                picture_url = uir.json().get("picture")
        except Exception:
            pass

    if not email:
        return HttpResponse("Google did not return email", status=400)

    # 3. Ищем пользователя по email
    user = User.objects.filter(email=email).first()

    if user:
        # Пользователь уже существует → это его аккаунт
        profile = user.profile

        # Обновляем provider
        profile.auth_provider = "google"
        profile.save()

    else:
        # Пользователя нет → создаём нового
        user = User.objects.create_user(
            username=google_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )

        profile = Profile.objects.create(
            user=user,
            auth_provider="google",
            name=f"{first_name} {last_name}".strip()
        )
        _try_apply_google_avatar_photo(profile, picture_url)

    if not user.is_active:
        return HttpResponse("Account is blocked", status=403)

    # 4. Логиним
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    return redirect("/apartments")


# FAVORITES ENDPOINTS

@login_required
@require_http_methods(["POST"])
def add_to_favorites(request):
    """Добавить объявление или соседа в избранное"""
    try:
        data = json.loads(request.body)
        listing_id = data.get('listing_id')
        profile_id = data.get('profile_id')  # для соседей
        
        if listing_id:
            listing = get_object_or_404(Listing, id=listing_id)
            profile = request.user.profile
            profile.favorite_listings.add(listing)
        elif profile_id:
            fav_profile = get_object_or_404(Profile, id=profile_id)
            profile = request.user.profile
            profile.favorite_profiles.add(fav_profile)
        else:
            return JsonResponse({"error": "listing_id or profile_id is required"}, status=400)
        
        return JsonResponse({
            "success": True,
            "message": "Добавлено в избранное",
            "is_favorite": True
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
def remove_from_favorites(request):
    """Удалить объявление или соседа из избранного"""
    try:
        data = json.loads(request.body)
        listing_id = data.get('listing_id')
        profile_id = data.get('profile_id')  # для соседей
        
        if listing_id:
            listing = get_object_or_404(Listing, id=listing_id)
            profile = request.user.profile
            profile.favorite_listings.remove(listing)
        elif profile_id:
            fav_profile = get_object_or_404(Profile, id=profile_id)
            profile = request.user.profile
            profile.favorite_profiles.remove(fav_profile)
        else:
            return JsonResponse({"error": "listing_id or profile_id is required"}, status=400)
        
        return JsonResponse({
            "success": True,
            "message": "Удалено из избранного",
            "is_favorite": False
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def get_favorites(request):
    """Получить все избранные объявления и соседей пользователя"""
    try:
        profile = request.user.profile
        listings = list(profile.favorite_listings.all())
        neighbors = list(profile.favorite_profiles.all())
        
        # Объединяем оба типа в один список
        all_favorites = []
        
        # Добавляем объявления
        for listing in listings:
            images = ListingImage.objects.filter(listing=listing).order_by("-is_primary", "id")
            image_url = images.first().image.url if images.exists() else None
            preview_imgs = list(images[:4])
            image_urls_preview = [request.build_absolute_uri(img.image.url) for img in preview_imgs]
            all_favorites.append({
                "id": listing.id,
                "type": "LISTING",
                "title": _safe_listing_title(listing),
                "description": _safe_listing_description(listing),
                "price": str(listing.price),
                "room_type": normalize_listing_type(listing.type),
                "city": listing.address,
                "region": listing.region,
                "area": listing.size,
                "image_url": image_url,
                "images": image_urls_preview,
                "amenities": listing.amenities or [],
                "is_favorite": True,
            })
        
        # Добавляем соседей
        for neighbor in neighbors:
            all_favorites.append({
                "id": neighbor.id,
                "type": "NEIGHBOUR",
                "name": neighbor.name,
                "age": neighbor.age,
                "city": neighbor.city,
                "image_url": neighbor.avatar.url if neighbor.avatar else None,
                "verified": neighbor.verified,
                "looking_for_housing": neighbor.looking_for_housing,
                "is_favorite": True,
            })
        
        # Пагинация
        page = int(request.GET.get('page', 1))
        paginator = Paginator(all_favorites, 12)
        favorites_page = paginator.get_page(page)
        
        return JsonResponse({
            "success": True,
            "count": paginator.count,
            "page": page,
            "total_pages": paginator.num_pages,
            "listings": list(favorites_page),
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def is_favorite(request):
    """Проверить, находится ли объявление или сосед в избранном"""
    try:
        listing_id = request.GET.get('listing_id')
        profile_id = request.GET.get('profile_id')
        
        profile = request.user.profile
        is_fav = False
        
        if listing_id:
            is_fav = profile.favorite_listings.filter(id=listing_id).exists()
        elif profile_id:
            is_fav = profile.favorite_profiles.filter(id=profile_id).exists()
        else:
            return JsonResponse({"error": "listing_id or profile_id is required"}, status=400)
        
        return JsonResponse({
            "is_favorite": is_fav
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)







