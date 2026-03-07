from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_profile_phone"),
        ("listings", "0005_listing_is_verified"),
    ]

    operations = [
        migrations.AddField(
            model_name="listing",
            name="max_residents",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.CreateModel(
            name="ListingResident",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "listing",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="residents", to="listings.listing"),
                ),
                (
                    "profile",
                    models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="home_residency", to="users.profile"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ListingInvite",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.CharField(max_length=32, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "accepted_by",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="accepted_listing_invites", to="users.profile"),
                ),
                (
                    "created_by",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="created_listing_invites", to="users.profile"),
                ),
                (
                    "listing",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="invites", to="listings.listing"),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="listingresident",
            constraint=models.UniqueConstraint(fields=("listing", "profile"), name="uniq_listing_profile_resident"),
        ),
    ]
