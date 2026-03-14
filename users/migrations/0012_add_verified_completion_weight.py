from decimal import Decimal

from django.db import migrations


VERIFIED_MIN_WEIGHT = Decimal("30.00")


def ensure_verified_completion_weight(apps, schema_editor):
    ProfileCompletionWeight = apps.get_model("users", "ProfileCompletionWeight")
    row, created = ProfileCompletionWeight.objects.get_or_create(
        attribute_key="verified",
        defaults={
            "label": "Verified Profile",
            "weight": VERIFIED_MIN_WEIGHT,
            "is_active": True,
        },
    )

    if not created:
        updated = False
        if row.label != "Verified Profile":
            row.label = "Verified Profile"
            updated = True
        if not row.is_active:
            row.is_active = True
            updated = True
        if row.weight is None or Decimal(str(row.weight)) < VERIFIED_MIN_WEIGHT:
            row.weight = VERIFIED_MIN_WEIGHT
            updated = True
        if updated:
            row.save(update_fields=["label", "is_active", "weight", "updated_at"])


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0011_profilecompletionweight"),
    ]

    operations = [
        migrations.RunPython(ensure_verified_completion_weight, migrations.RunPython.noop),
    ]
