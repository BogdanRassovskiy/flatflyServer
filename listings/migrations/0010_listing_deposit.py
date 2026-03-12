from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0009_listing_is_active"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="deposit",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
