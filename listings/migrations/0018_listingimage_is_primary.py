from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0017_remove_listing_property_type_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="listingimage",
            name="is_primary",
            field=models.BooleanField(default=False),
        ),
    ]
