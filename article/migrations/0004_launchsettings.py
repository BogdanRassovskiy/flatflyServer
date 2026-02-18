from django.db import migrations, models
import article.models


class Migration(migrations.Migration):

    dependencies = [
        ("article", "0003_seed_faq_translations"),
    ]

    operations = [
        migrations.CreateModel(
            name="LaunchSettings",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("launch_date", models.DateTimeField(default=article.models.default_launch_date)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Launch settings",
                "verbose_name_plural": "Launch settings",
            },
        ),
    ]
