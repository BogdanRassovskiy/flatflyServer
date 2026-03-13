from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0014_remove_listing_property_type_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="CzechStreet",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("osm_id", models.BigIntegerField(unique=True)),
                ("name", models.CharField(db_index=True, max_length=255)),
                ("normalized_name", models.CharField(db_index=True, max_length=255)),
                ("city_name", models.CharField(db_index=True, max_length=255)),
                ("normalized_city_name", models.CharField(db_index=True, max_length=255)),
                ("region_code", models.CharField(blank=True, db_index=True, default="", max_length=32)),
                ("latitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("source", models.CharField(default="OSM", max_length=32)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["city_name", "name", "id"],
                "indexes": [
                    models.Index(fields=["region_code", "city_name", "name"], name="idx_street_region_city_name"),
                ],
            },
        ),
    ]
