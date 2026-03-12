import json
import time
import unicodedata
import urllib.parse
import urllib.request
from urllib.error import HTTPError, URLError

from django.core.management.base import BaseCommand

from listings.models import CzechMunicipality


REGION_NAME_BY_CODE = {
    "PRAGUE": "Praha",
    "STREDOCESKY": "Středočeský kraj",
    "JIHOCESKY": "Jihočeský kraj",
    "PLZENSKY": "Plzeňský kraj",
    "KARLOVARSKY": "Karlovarský kraj",
    "USTECKY": "Ústecký kraj",
    "LIBERECKY": "Liberecký kraj",
    "KRALOVEHRADECKY": "Královéhradecký kraj",
    "PARDUBICKY": "Pardubický kraj",
    "VYSOCINA": "Kraj Vysočina",
    "JIHOMORAVSKY": "Jihomoravský kraj",
    "OLOMOUCKY": "Olomoucký kraj",
    "ZLINSKY": "Zlínský kraj",
    "MORAVSKOSLEZSKY": "Moravskoslezský kraj",
}


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKD", (value or "")).encode("ascii", "ignore").decode("ascii").lower().strip()


def build_region_municipalities_query(region_name: str) -> str:
    escaped_name = region_name.replace('"', '\\"')
    return (
        '[out:json][timeout:180];'
        f'relation["boundary"="administrative"]["admin_level"="4"]["name"="{escaped_name}"];'
        'map_to_area->.a;'
        'relation["boundary"="administrative"]["admin_level"="8"](area.a);'
        'out tags;'
    )


def build_region_relation_query(region_name: str) -> str:
    escaped_name = region_name.replace('"', '\\"')
    return (
        '[out:json][timeout:120];'
        f'relation["boundary"="administrative"]["admin_level"="4"]["name"="{escaped_name}"];'
        'out tags ids;'
    )


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
                with urllib.request.urlopen(request, timeout=240) as response:
                    return json.load(response)
            except (HTTPError, URLError, TimeoutError) as error:
                last_error = error
                continue
        time.sleep(min(8, attempt * 2))

    raise RuntimeError(f"Overpass request failed after retries: {last_error}")


class Command(BaseCommand):
    help = "Import Czech municipalities (obce) from Overpass OSM into CzechMunicipality table."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="Delete existing municipalities before import.")

    def handle(self, *args, **options):
        if options.get("clear"):
            deleted_count, _ = CzechMunicipality.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Deleted {deleted_count} existing municipality rows."))

        upserted = 0
        seen_osm_ids = set()

        for region_code, region_name in REGION_NAME_BY_CODE.items():
            self.stdout.write(f"Loading municipalities for {region_code} ({region_name})...")
            payload = overpass_request(build_region_municipalities_query(region_name))
            elements = payload.get("elements", [])

            if region_code == "PRAGUE" and not elements:
                relation_payload = overpass_request(build_region_relation_query(region_name))
                relation_elements = relation_payload.get("elements", [])
                if relation_elements:
                    relation = relation_elements[0]
                    elements = [
                        {
                            "id": relation.get("id"),
                            "tags": {
                                "name": "Praha",
                                "name:prefix": "město",
                                "ref": relation.get("tags", {}).get("ref", ""),
                                "population": relation.get("tags", {}).get("population"),
                            },
                        }
                    ]

            for element in elements:
                tags = element.get("tags", {})
                name = str(tags.get("name") or "").strip()
                if not name:
                    continue

                osm_id = int(element.get("id"))
                if osm_id in seen_osm_ids:
                    continue
                seen_osm_ids.add(osm_id)

                code = str(tags.get("ref") or "").strip()
                municipality_type = str(tags.get("name:prefix") or "obec").strip().lower()
                population_value = tags.get("population")
                try:
                    population = int(str(population_value).replace(" ", "")) if population_value else None
                except ValueError:
                    population = None

                CzechMunicipality.objects.update_or_create(
                    osm_id=osm_id,
                    defaults={
                        "code": code,
                        "name": name,
                        "normalized_name": normalize_text(name),
                        "region_code": region_code,
                        "municipality_type": municipality_type,
                        "population": population,
                        "source": "OSM",
                    },
                )
                upserted += 1

            self.stdout.write(self.style.SUCCESS(f"Region {region_code}: processed {len(elements)} rows."))

        self.stdout.write(self.style.SUCCESS(f"Import completed. Upserted rows: {upserted}"))
