from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0006_listing_home_architecture"),
    ]

    operations = [
        migrations.AlterField(
            model_name="listing",
            name="owner",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="listings", to=settings.AUTH_USER_MODEL),
        ),
    ]
