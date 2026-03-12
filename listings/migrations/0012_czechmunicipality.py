from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0011_listingfilterconfig"),
    ]

    operations = [
        migrations.CreateModel(
            name="CzechMunicipality",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("osm_id", models.BigIntegerField(unique=True)),
                ("code", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                ("name", models.CharField(db_index=True, max_length=255)),
                ("normalized_name", models.CharField(db_index=True, max_length=255)),
                ("region_code", models.CharField(blank=True, db_index=True, default="", max_length=32)),
                ("municipality_type", models.CharField(blank=True, default="obec", max_length=32)),
                ("population", models.PositiveIntegerField(blank=True, null=True)),
                ("source", models.CharField(default="OSM", max_length=32)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["name", "id"],
            },
        ),
    ]
