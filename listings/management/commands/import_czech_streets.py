import json
import time
import urllib.parse
import urllib.request
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError

from django.core.management.base import BaseCommand
from django.db.models import Q

from listings.models import CzechMunicipality, CzechStreet, Listing


def normalize_text(value: str) -> str:
    import unicodedata

    return unicodedata.normalize("NFKD", (value or "")).encode("ascii", "ignore").decode("ascii").lower().strip()


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


def build_streets_query(city_name: str, region_name: str = "") -> str:
    escaped_city = city_name.replace('"', '\\"')

    return (
        "[out:json][timeout:240];"
        "("
        f'relation["boundary"="administrative"]["admin_level"~"8|9"]["name"="{escaped_city}"];'
        f'relation["boundary"="administrative"]["admin_level"~"8|9"]["name:cs"="{escaped_city}"];'
        ");"
        "map_to_area->.a;"
        "way[\"highway\"][\"name\"](area.a);"
        "out tags center;"
    )


def build_streets_fallback_query(lat: Decimal, lon: Decimal, radius_m: int = 7000) -> str:
    return (
        "[out:json][timeout:240];"
        f'way["highway"]["name"](around:{int(radius_m)},{lat},{lon});'
        "out tags center;"
    )


class Command(BaseCommand):
    help = "Import Czech streets from OSM Overpass into CzechStreet for selected municipalities."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Delete existing streets before import.")
        parser.add_argument("--region", type=str, help="Filter municipalities by region code (e.g. PRAGUE).")
        parser.add_argument("--city", action="append", default=[], help="City name to import (repeatable).")
        parser.add_argument("--from-listings", action="store_true", help="Use distinct listing city/region pairs as import scope.")
        parser.add_argument("--limit-cities", type=int, default=80, help="Max municipalities to import when not explicit.")

    def handle(self, *args, **options):
        if options.get("clear"):
            deleted_count, _ = CzechStreet.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted_count} existing street rows."))

        region_filter = str(options.get("region") or "").strip().upper()
        explicit_cities = [str(c or "").strip() for c in options.get("city", []) if str(c or "").strip()]
        from_listings = bool(options.get("from_listings"))
        limit_cities = max(1, min(int(options.get("limit_cities") or 80), 300))

        targets = []

        if explicit_cities:
            for city_name in explicit_cities:
                municipality = CzechMunicipality.objects.filter(
                    Q(name__iexact=city_name) | Q(normalized_name=normalize_text(city_name))
                )
                if region_filter:
                    municipality = municipality.filter(region_code=region_filter)
                municipality = municipality.order_by("id").first()
                if municipality:
                    targets.append((municipality.name, municipality.region_code))
                else:
                    targets.append((city_name, region_filter))

        if from_listings:
            listing_pairs = (
                Listing.objects.exclude(city="").values_list("city", "region").distinct()
            )
            for city_name, region_code in listing_pairs:
                city_text = str(city_name or "").strip()
                region_code_text = str(region_code or "").strip().upper()
                if not city_text:
                    continue
                if region_filter and region_code_text != region_filter:
                    continue
                targets.append((city_text, region_code_text))

        if not targets:
            municipalities = CzechMunicipality.objects.all()
            if region_filter:
                municipalities = municipalities.filter(region_code=region_filter)
            municipalities = municipalities.order_by("population", "name")[:limit_cities]
            targets = [(m.name, m.region_code) for m in municipalities]

        unique_targets = []
        seen = set()
        for city_name, region_code in targets:
            key = (normalize_text(city_name), str(region_code or "").upper())
            if key in seen:
                continue
            seen.add(key)
            unique_targets.append((city_name, region_code))

        upserted = 0
        processed_cities = 0

        for city_name, region_code in unique_targets[:limit_cities]:
            municipality = CzechMunicipality.objects.filter(
                Q(name__iexact=city_name) | Q(normalized_name=normalize_text(city_name))
            )
            if region_code:
                municipality = municipality.filter(region_code=region_code)
            municipality = municipality.order_by("id").first()

            if municipality:
                city_name = municipality.name
                region_code = municipality.region_code

            self.stdout.write(f"Loading streets for {city_name} ({region_code or 'N/A'})...")
            payload = None
            try:
                payload = overpass_request(build_streets_query(city_name, region_code))
            except Exception as error:
                self.stdout.write(self.style.WARNING(f"Area query failed for {city_name}: {error}"))

            if payload is None or not payload.get("elements"):
                municipality_for_center = CzechMunicipality.objects.filter(
                    Q(name__iexact=city_name) | Q(normalized_name=normalize_text(city_name))
                )
                if region_code:
                    municipality_for_center = municipality_for_center.filter(region_code=region_code)
                municipality_for_center = municipality_for_center.order_by("id").first()

                lat = municipality_for_center.latitude if municipality_for_center else None
                lon = municipality_for_center.longitude if municipality_for_center else None
                if lat is None or lon is None:
                    self.stdout.write(self.style.WARNING(f"No municipality center for {city_name}, skipping."))
                    continue

                try:
                    payload = overpass_request(build_streets_fallback_query(lat, lon, 8000))
                except Exception as error:
                    self.stdout.write(self.style.WARNING(f"Fallback query failed for {city_name}: {error}"))
                    continue

            elements = payload.get("elements", [])
            processed_cities += 1

            for element in elements:
                tags = element.get("tags", {})
                street_name = str(tags.get("name") or "").strip()
                if not street_name:
                    continue

                osm_id = int(element.get("id"))
                center = element.get("center") or {}
                latitude = parse_decimal_coordinate(center.get("lat"))
                longitude = parse_decimal_coordinate(center.get("lon"))

                CzechStreet.objects.update_or_create(
                    osm_id=osm_id,
                    defaults={
                        "name": street_name,
                        "normalized_name": normalize_text(street_name),
                        "city_name": city_name,
                        "normalized_city_name": normalize_text(city_name),
                        "region_code": region_code or "",
                        "latitude": latitude,
                        "longitude": longitude,
                        "source": "OSM",
                    },
                )
                upserted += 1

            self.stdout.write(self.style.SUCCESS(f"{city_name}: processed {len(elements)} OSM ways."))

        self.stdout.write(self.style.SUCCESS(
            f"Street import completed. Cities processed: {processed_cities}. Upserted streets: {upserted}."
        ))
