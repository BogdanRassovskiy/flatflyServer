from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0008_profilereview"),
    ]

    operations = [
        migrations.CreateModel(
            name="University",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("normalized_name", models.CharField(db_index=True, max_length=255, unique=True)),
                ("short_name", models.CharField(blank=True, default="", max_length=64)),
                ("city", models.CharField(blank=True, default="", max_length=128)),
                ("address", models.CharField(blank=True, default="", max_length=255)),
                ("latitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("osm_ref", models.CharField(blank=True, default="", max_length=64, unique=True)),
                ("source", models.CharField(default="OSM", max_length=32)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["name", "id"],
            },
        ),
        migrations.CreateModel(
            name="UniversityFaculty",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("normalized_name", models.CharField(db_index=True, max_length=255)),
                ("city", models.CharField(blank=True, default="", max_length=128)),
                ("address", models.CharField(blank=True, default="", max_length=255)),
                ("latitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("osm_ref", models.CharField(blank=True, default="", max_length=64, unique=True)),
                ("source", models.CharField(default="OSM", max_length=32)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "university",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="faculties", to="users.university"),
                ),
            ],
            options={
                "ordering": ["university", "name", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="universityfaculty",
            constraint=models.UniqueConstraint(fields=("university", "normalized_name", "address"), name="uniq_university_faculty_name_address"),
        ),
        migrations.AddField(
            model_name="profile",
            name="faculty",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="profiles", to="users.universityfaculty"),
        ),
        migrations.AddField(
            model_name="profile",
            name="university",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="profiles", to="users.university"),
        ),
    ]
