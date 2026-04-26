# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chats", "0011_listing_card_reaction_model"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="edited_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
