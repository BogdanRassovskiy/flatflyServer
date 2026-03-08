from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0008_listing_utilities_fee"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
    ]
