from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0021_listing_telegram_message_ids"),
    ]

    operations = [
        migrations.AlterField(
            model_name="listingreport",
            name="listing",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reports",
                to="listings.listing",
            ),
        ),
    ]

