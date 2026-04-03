from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0019_profile_facebook_profile_instagram"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="cover_photo",
            field=models.ImageField(blank=True, null=True, upload_to="profile_covers/"),
        ),
        migrations.CreateModel(
            name="ProfileGalleryPhoto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="profile_gallery/")),
                ("caption", models.CharField(blank=True, default="", max_length=200)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="gallery_photos",
                        to="users.profile",
                    ),
                ),
            ],
            options={
                "ordering": ["sort_order", "id"],
            },
        ),
    ]
