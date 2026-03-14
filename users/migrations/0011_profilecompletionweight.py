from decimal import Decimal

from django.db import migrations, models


DEFAULT_COMPLETION_WEIGHTS = [
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


def seed_profile_completion_weights(apps, schema_editor):
    ProfileCompletionWeight = apps.get_model("users", "ProfileCompletionWeight")
    for attribute_key, label, weight in DEFAULT_COMPLETION_WEIGHTS:
        ProfileCompletionWeight.objects.update_or_create(
            attribute_key=attribute_key,
            defaults={
                "label": label,
                "weight": weight,
                "is_active": True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0010_profile_location_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProfileCompletionWeight",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("attribute_key", models.CharField(max_length=64, unique=True)),
                ("label", models.CharField(max_length=128)),
                ("weight", models.DecimalField(decimal_places=2, default=1, max_digits=6)),
                ("is_active", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["attribute_key", "id"]},
        ),
        migrations.RunPython(seed_profile_completion_weights, migrations.RunPython.noop),
    ]
