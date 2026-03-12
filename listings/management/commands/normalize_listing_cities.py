from django.core.management.base import BaseCommand
from django.db.models import Q

from listings.models import Listing, CzechMunicipality
from flatflyServer.views import normalize_text


REGION_DEFAULT_CITY = {
    "PRAGUE": "Praha",
    "STREDOCESKY": "Kladno",
    "JIHOCESKY": "Ceske Budejovice",
    "PLZENSKY": "Plzen",
    "KARLOVARSKY": "Karlovy Vary",
    "USTECKY": "Usti nad Labem",
    "LIBERECKY": "Liberec",
    "KRALOVEHRADECKY": "Hradec Kralove",
    "PARDUBICKY": "Pardubice",
    "VYSOCINA": "Jihlava",
    "JIHOMORAVSKY": "Brno",
    "OLOMOUCKY": "Olomouc",
    "ZLINSKY": "Zlin",
    "MORAVSKOSLEZSKY": "Ostrava",
}


class Command(BaseCommand):
    help = "Normalize listing city values so they always belong to listing region based on CzechMunicipality."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show changes without updating DB")

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)

        updated = []
        skipped = []

        listings = Listing.objects.all().order_by("id")
        for listing in listings:
            city_text = str(listing.city or "").strip()
            region_code = str(listing.region or "").strip().upper()

            valid_qs = CzechMunicipality.objects.filter(region_code=region_code)
            if city_text:
                normalized_city = normalize_text(city_text)
                is_valid = valid_qs.filter(
                    Q(name__iexact=city_text) | Q(normalized_name=normalized_city)
                ).exists()
                if is_valid:
                    continue

            preferred = REGION_DEFAULT_CITY.get(region_code)
            replacement = None

            if preferred:
                preferred_norm = normalize_text(preferred)
                preferred_obj = valid_qs.filter(
                    Q(name__iexact=preferred) | Q(normalized_name=preferred_norm)
                ).first()
                if preferred_obj:
                    replacement = preferred_obj.name

            if not replacement:
                first_obj = valid_qs.order_by("name").first()
                if first_obj:
                    replacement = first_obj.name

            if not replacement:
                skipped.append((listing.id, region_code, city_text))
                continue

            updated.append((listing.id, region_code, city_text, replacement))
            if not dry_run:
                listing.city = replacement
                listing.save(update_fields=["city"])

        for item in updated[:50]:
            self.stdout.write(f"Listing {item[0]} [{item[1]}]: '{item[2]}' -> '{item[3]}'")

        if len(updated) > 50:
            self.stdout.write(f"... and {len(updated) - 50} more updates")

        if skipped:
            self.stdout.write(self.style.WARNING(f"Skipped {len(skipped)} listings (no municipality in region dictionary)."))
            for item in skipped[:20]:
                self.stdout.write(f"Skipped listing {item[0]} [{item[1]}], city='{item[2]}'")

        if dry_run:
            self.stdout.write(self.style.WARNING(f"Dry run complete. Planned updates: {len(updated)}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Normalization complete. Updated listings: {len(updated)}"))
