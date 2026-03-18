from django.db import migrations


def remove_pensioner_ranking_config(apps, schema_editor):
    ProfileRankingConfig = apps.get_model("users", "ProfileRankingConfig")
    ProfileRankingConfig.objects.filter(code="pensioner").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0015_profile_status_flags_and_ranking_configs"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="profile",
            name="pensioner",
        ),
        migrations.RunPython(remove_pensioner_ranking_config, migrations.RunPython.noop),
    ]

