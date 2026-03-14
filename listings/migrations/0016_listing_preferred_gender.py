from django.db import migrations, models
import random


def backfill_preferred_gender_and_config(apps, schema_editor):
    Listing = apps.get_model("listings", "Listing")
    ListingFilterConfig = apps.get_model("listings", "ListingFilterConfig")

    gender_values = ["male", "female", "any"]

    for listing in Listing.objects.all().only("id"):
        listing.preferred_gender = random.choice(gender_values)
        listing.save(update_fields=["preferred_gender"])

    ListingFilterConfig.objects.update_or_create(
        code="preferred_gender",
        defaults={
            "name": "Предпочитаемый пол",
            "weight": 0.8,
            "hard_filter": True,
            "relaxation_order": 18,
            "enabled": True,
            "value_type": "choice",
            "description": "Предпочитаемый пол жильца: male/female/any",
        },
    )


def revert_preferred_gender_config(apps, schema_editor):
    ListingFilterConfig = apps.get_model("listings", "ListingFilterConfig")
    ListingFilterConfig.objects.filter(code="preferred_gender").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0015_czechstreet"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="preferred_gender",
            field=models.CharField(
                choices=[("male", "Male"), ("female", "Female"), ("any", "Any")],
                default="any",
                max_length=10,
            ),
        ),
        migrations.RunPython(backfill_preferred_gender_and_config, revert_preferred_gender_config),
    ]
