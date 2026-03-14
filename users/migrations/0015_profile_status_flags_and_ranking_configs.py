from decimal import Decimal

from django.db import migrations, models


def add_status_ranking_configs(apps, schema_editor):
    ProfileRankingConfig = apps.get_model("users", "ProfileRankingConfig")

    defaults = [
        ("with_children", "With Children", Decimal("4.00"), True),
        ("with_disability", "With Disability", Decimal("4.00"), True),
        ("pensioner", "Pensioner", Decimal("4.00"), True),
    ]

    for code, label, weight, hard_filter in defaults:
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
        ("users", "0014_add_university_profile_ranking_config"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="pensioner",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="profile",
            name="with_children",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="profile",
            name="with_disability",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(add_status_ranking_configs, migrations.RunPython.noop),
    ]
