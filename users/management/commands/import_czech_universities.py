import json
import time
import unicodedata
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError

from django.core.management.base import BaseCommand
from django.db.models import Q

from users.models import University, UniversityFaculty


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii").lower().strip()


def is_faculty_like_name(name: str) -> bool:
    normalized = normalize_text(name)
    return "fakulta" in normalized or "faculty" in normalized


def parse_decimal_coordinate(raw_value):
    if raw_value is None or raw_value == "":
        return None
    try:
        return Decimal(str(raw_value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def overpass_request(query: str) -> dict:
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://lz4.overpass-api.de/api/interpreter",
    ]
    last_error = None

    for attempt in range(1, 5):
        for endpoint in endpoints:
            try:
                request = urllib.request.Request(
                    endpoint,
                    data=urllib.parse.urlencode({"data": query}).encode("utf-8"),
                    method="POST",
                )
                with urllib.request.urlopen(request, timeout=300) as response:
                    return json.load(response)
            except (HTTPError, URLError, TimeoutError) as error:
                last_error = error
                continue
        time.sleep(min(8, attempt * 2))

    raise RuntimeError(f"Overpass request failed after retries: {last_error}")


def build_universities_query() -> str:
    return (
        "[out:json][timeout:240];"
        "area[\"ISO3166-1\"=\"CZ\"][admin_level=2]->.cz;"
        "(nwr[\"amenity\"=\"university\"](area.cz););"
        "out tags center;"
    )


def build_faculties_around_query(lat: Decimal, lon: Decimal, radius_m: int = 5000) -> str:
    return (
        "[out:json][timeout:120];"
        "("
        f'nwr["name"~"fakulta|faculty", i](around:{int(radius_m)},{lat},{lon});'
        f'nwr["amenity"="university"]["name"~"fakulta|faculty", i](around:{int(radius_m)},{lat},{lon});'
        f'nwr["building"~"university|college", i]["name"~"fakulta|faculty", i](around:{int(radius_m)},{lat},{lon});'
        ");"
        "out tags center;"
    )


def element_coords(element):
    center = element.get("center") or {}
    lat = parse_decimal_coordinate(center.get("lat"))
    lon = parse_decimal_coordinate(center.get("lon"))
    if lat is None or lon is None:
        lat = parse_decimal_coordinate(element.get("lat"))
        lon = parse_decimal_coordinate(element.get("lon"))
    return lat, lon


def build_address(tags):
    road = str(tags.get("addr:street") or "").strip()
    house = str(tags.get("addr:housenumber") or "").strip()
    city = str(tags.get("addr:city") or "").strip()
    address = " ".join(part for part in [road, house] if part).strip()
    return address, city


class Command(BaseCommand):
    help = "Import Czech universities and faculty buildings (address + geolocation) from OSM Overpass."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Clear existing universities and faculties before import.")
        parser.add_argument("--faculties-only", action="store_true", help="Skip universities import and update only faculties.")
        parser.add_argument("--max-universities", type=int, default=120, help="Maximum number of universities for faculty import step.")
        parser.add_argument("--radius", type=int, default=5000, help="Radius in meters for faculty lookup around university point.")

    def handle(self, *args, **options):
        if options.get("clear"):
            UniversityFaculty.objects.all().delete()
            University.objects.all().delete()
            self.stdout.write(self.style.WARNING("Cleared universities and faculties."))

        universities_by_normalized = {}
        if not options.get("faculties_only"):
            universities_payload = overpass_request(build_universities_query())
            universities_elements = universities_payload.get("elements", [])

            for element in universities_elements:
                tags = element.get("tags", {})
                raw_name = str(tags.get("name") or "").strip()
                operator = str(tags.get("operator") or "").strip()
                short_name = str(tags.get("short_name") or tags.get("official_short_type") or "").strip()

                university_name = raw_name
                if is_faculty_like_name(university_name) and operator and not is_faculty_like_name(operator):
                    university_name = operator

                if not university_name:
                    continue
                if is_faculty_like_name(university_name):
                    continue

                normalized_name = normalize_text(university_name)
                lat, lon = element_coords(element)
                address, city = build_address(tags)
                osm_ref = f"{element.get('type','n')}/{element.get('id')}"

                university, _ = University.objects.update_or_create(
                    normalized_name=normalized_name,
                    defaults={
                        "name": university_name,
                        "short_name": short_name,
                        "city": city,
                        "address": address,
                        "latitude": lat,
                        "longitude": lon,
                        "osm_ref": osm_ref,
                        "source": "OSM",
                    },
                )
                universities_by_normalized[normalized_name] = university

            self.stdout.write(self.style.SUCCESS(f"Universities upserted: {len(universities_by_normalized)}"))
        else:
            for university in University.objects.all():
                universities_by_normalized[normalize_text(university.name)] = university
            self.stdout.write(self.style.SUCCESS(f"Using existing universities: {len(universities_by_normalized)}"))

        # 2) Faculties / buildings (batched around each university)
        max_universities = max(1, min(int(options.get("max_universities") or 120), 400))
        radius = max(1000, min(int(options.get("radius") or 5000), 12000))

        universities_for_faculties = list(
            University.objects.exclude(latitude__isnull=True).exclude(longitude__isnull=True).order_by("name")[:max_universities]
        )

        faculties_elements = []
        for university in universities_for_faculties:
            try:
                payload = overpass_request(build_faculties_around_query(university.latitude, university.longitude, radius))
                for element in payload.get("elements", []):
                    element_tags = element.setdefault("tags", {})
                    element_tags.setdefault("_university_hint", university.name)
                faculties_elements.extend(payload.get("elements", []))
            except Exception as error:
                self.stdout.write(self.style.WARNING(f"Faculties query failed near {university.name}: {error}"))
                continue

        faculty_upserted = 0
        for element in faculties_elements:
            tags = element.get("tags", {})
            faculty_name = str(tags.get("name") or "").strip()
            if not faculty_name:
                continue

            operator = str(tags.get("operator") or "").strip()
            branch = str(tags.get("branch") or "").strip()
            university_hint = str(tags.get("_university_hint") or "").strip()

            university_name = operator or branch
            if not university_name:
                # fallback: choose best university by token inclusion
                normalized_faculty_name = normalize_text(faculty_name)
                candidates = [
                    (uni_norm, uni)
                    for uni_norm, uni in universities_by_normalized.items()
                    if uni_norm and uni_norm in normalized_faculty_name
                ]
                if candidates:
                    candidates.sort(key=lambda x: len(x[0]), reverse=True)
                    university = candidates[0][1]
                elif university_hint:
                    university = University.objects.filter(normalized_name=normalize_text(university_hint)).first()
                else:
                    continue
            else:
                normalized_university_name = normalize_text(university_name)
                university = universities_by_normalized.get(normalized_university_name)
                if not university:
                    university = University.objects.filter(normalized_name=normalized_university_name).first()
                if not university:
                    continue

            lat, lon = element_coords(element)
            address, city = build_address(tags)
            osm_ref = f"{element.get('type','n')}/{element.get('id')}"

            defaults = {
                "university": university,
                "name": faculty_name,
                "normalized_name": normalize_text(faculty_name),
                "city": city,
                "address": address,
                "latitude": lat,
                "longitude": lon,
                "source": "OSM",
            }

            existing = UniversityFaculty.objects.filter(osm_ref=osm_ref).first()
            if existing:
                for key, value in defaults.items():
                    setattr(existing, key, value)
                existing.osm_ref = osm_ref
                existing.save()
            else:
                UniversityFaculty.objects.create(osm_ref=osm_ref, **defaults)

            faculty_upserted += 1

        self.stdout.write(self.style.SUCCESS(f"Faculties/buildings upserted: {faculty_upserted}"))
