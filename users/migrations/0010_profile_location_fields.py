from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0009_university_universityfaculty_profile_education"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="location_address",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="profile",
            name="location_city",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="profile",
            name="location_latitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="location_longitude",
            field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="location_region",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
    ]
