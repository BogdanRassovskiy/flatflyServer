from decimal import Decimal

from django.db import migrations, models


DEFAULT_PROFILE_RANKING_CONFIGS = [
    ("city", "City", Decimal("6.00"), True),
    ("gender", "Gender", Decimal("6.00"), True),
    ("age_range", "Age Range", Decimal("6.00"), True),
    ("smoking", "Smoking", Decimal("4.00"), False),
    ("alcohol", "Alcohol", Decimal("4.00"), False),
    ("sleep_schedule", "Sleep Schedule", Decimal("4.00"), False),
    ("work_from_home", "Work From Home", Decimal("4.00"), False),
    ("languages", "Languages", Decimal("5.00"), False),
    ("profession", "Profession", Decimal("3.00"), False),
    ("interests", "Interests", Decimal("2.00"), False),
    ("verified", "Verified", Decimal("5.00"), False),
    ("looking_for_housing", "Looking For Housing", Decimal("3.00"), True),
    ("rating_min", "Minimum Rating", Decimal("1.00"), True),
]


def seed_profile_ranking_configs(apps, schema_editor):
    ProfileRankingConfig = apps.get_model("users", "ProfileRankingConfig")

    for code, label, weight, hard_filter in DEFAULT_PROFILE_RANKING_CONFIGS:
        ProfileRankingConfig.objects.update_or_create(
            code=code,
            defaults={
                "label": label,
                "weight": weight,
                "hard_filter": hard_filter,
                "is_active": True,
            },
        )


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0012_add_verified_completion_weight"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProfileRankingConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=64, unique=True)),
                ("label", models.CharField(max_length=128)),
                ("weight", models.DecimalField(decimal_places=2, default=1, max_digits=6)),
                ("hard_filter", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["code", "id"]},
        ),
        migrations.RunPython(seed_profile_ranking_configs, migrations.RunPython.noop),
    ]
