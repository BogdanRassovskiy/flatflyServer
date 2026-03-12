from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_profile_phone"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProfileReview",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("rating", models.PositiveSmallIntegerField()),
                ("comment", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("reviewer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="given_reviews", to="users.profile")),
                ("target", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="received_reviews", to="users.profile")),
            ],
        ),
        migrations.AddConstraint(
            model_name="profilereview",
            constraint=models.UniqueConstraint(fields=("reviewer", "target"), name="uniq_profile_review_reviewer_target"),
        ),
    ]
