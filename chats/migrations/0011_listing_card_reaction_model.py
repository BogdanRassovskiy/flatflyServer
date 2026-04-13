# ListingCardReaction — таблица могла уже существовать вне миграций.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def ensure_listing_reaction_table(apps, schema_editor):
    conn = schema_editor.connection
    if "chats_listingcardreaction" in conn.introspection.table_names():
        return
    from chats.models import ListingCardReaction

    schema_editor.create_model(ListingCardReaction)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("chats", "0010_message_reply_to"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="ListingCardReaction",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("is_like", models.BooleanField()),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                        ("updated_at", models.DateTimeField(auto_now=True)),
                        (
                            "message",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="listing_reactions",
                                to="chats.message",
                            ),
                        ),
                        (
                            "user",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="listing_card_reactions",
                                to=settings.AUTH_USER_MODEL,
                            ),
                        ),
                    ],
                ),
                migrations.AddConstraint(
                    model_name="listingcardreaction",
                    constraint=models.UniqueConstraint(
                        fields=("message", "user"),
                        name="uniq_listing_reaction_message_user",
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(ensure_listing_reaction_table, migrations.RunPython.noop),
            ],
        ),
    ]
