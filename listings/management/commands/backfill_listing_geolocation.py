import math
import random
import unicodedata
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand
from django.db.models import Q

from listings.models import CzechMunicipality, Listing


EARTH_RADIUS_KM = 6371.0


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKD", (value or "")).encode("ascii", "ignore").decode("ascii").lower().strip()


def destination_point(lat_deg: float, lon_deg: float, distance_km: float, bearing_deg: float):
    lat1 = math.radians(lat_deg)
    lon1 = math.radians(lon_deg)
    bearing = math.radians(bearing_deg)
    angular_distance = distance_km / EARTH_RADIUS_KM

    sin_lat1 = math.sin(lat1)
    cos_lat1 = math.cos(lat1)
    sin_ang = math.sin(angular_distance)
    cos_ang = math.cos(angular_distance)

    lat2 = math.asin(sin_lat1 * cos_ang + cos_lat1 * sin_ang * math.cos(bearing))
    lon2 = lon1 + math.atan2(
        math.sin(bearing) * sin_ang * cos_lat1,
        cos_ang - sin_lat1 * math.sin(lat2),
    )

    lat_out = math.degrees(lat2)
    lon_out = math.degrees(lon2)
    # Normalize longitude to [-180, 180]
    lon_out = ((lon_out + 180) % 360) - 180
    return lat_out, lon_out


def to_decimal_6(value: float) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)


class Command(BaseCommand):
    help = "Backfill listing geo_lat/geo_lng from municipality coordinates with 1-7km random offset."

    def add_arguments(self, parser):
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Recalculate geo_lat/geo_lng even for listings that already have coordinates.",
        )
        parser.add_argument(
            "--min-km",
            type=float,
            default=1.0,
            help="Minimum offset distance in km (default: 1.0).",
        )
        parser.add_argument(
            "--max-km",
            type=float,
            default=7.0,
            help="Maximum offset distance in km (default: 7.0).",
        )

    def handle(self, *args, **options):
        overwrite = bool(options.get("overwrite"))
        min_km = float(options.get("min_km") or 1.0)
        max_km = float(options.get("max_km") or 7.0)

        if min_km <= 0 or max_km <= 0 or min_km > max_km:
            raise ValueError("Distance range must satisfy 0 < min_km <= max_km")

        qs = Listing.objects.all()
        if not overwrite:
            qs = qs.filter(Q(geo_lat__isnull=True) | Q(geo_lng__isnull=True))

        total_candidates = qs.count()
        if total_candidates == 0:
            self.stdout.write(self.style.SUCCESS("No listings need geolocation backfill."))
            return

        updated_count = 0
        skipped_count = 0

        for listing in qs.iterator(chunk_size=200):
            city = str(listing.city or "").strip()
            if not city:
                skipped_count += 1
                continue

            city_normalized = normalize_text(city)
            municipality = CzechMunicipality.objects.filter(
                region_code=str(listing.region or "").upper()
            ).filter(
                Q(name__iexact=city) | Q(normalized_name=city_normalized)
            ).first()

            if municipality is None:
                # Fallback by city match when region mapping is imperfect.
                municipality = CzechMunicipality.objects.filter(
                    Q(name__iexact=city) | Q(normalized_name=city_normalized)
                ).first()

            if municipality is None or municipality.latitude is None or municipality.longitude is None:
                skipped_count += 1
                continue

            base_lat = float(municipality.latitude)
            base_lng = float(municipality.longitude)

            rng = random.Random(listing.id)
            distance_km = rng.uniform(min_km, max_km)
            bearing_deg = rng.uniform(0.0, 360.0)
            offset_lat, offset_lng = destination_point(base_lat, base_lng, distance_km, bearing_deg)

            listing.geo_lat = to_decimal_6(offset_lat)
            listing.geo_lng = to_decimal_6(offset_lng)
            listing.save(update_fields=["geo_lat", "geo_lng"])
            updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Backfill completed. Candidates={total_candidates}, updated={updated_count}, skipped={skipped_count}."
            )
        )
