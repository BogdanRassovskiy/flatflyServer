from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0007_make_owner_optional"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="utilities_fee",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
