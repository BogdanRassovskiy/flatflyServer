from decimal import Decimal

from django.db import migrations


def add_university_profile_ranking_config(apps, schema_editor):
    ProfileRankingConfig = apps.get_model("users", "ProfileRankingConfig")
    ProfileRankingConfig.objects.update_or_create(
        code="university",
        defaults={
            "label": "University",
            "weight": Decimal("6.00"),
            "hard_filter": True,
            "is_active": True,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0013_profilerankingconfig"),
    ]

    operations = [
        migrations.RunPython(add_university_profile_ranking_config, migrations.RunPython.noop),
    ]
