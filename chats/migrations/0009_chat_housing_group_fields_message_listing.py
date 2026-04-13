# Generated manually for "Ищем вместе" housing group chats

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("listings", "0022_listingreport_listing_nullable"),
        ("chats", "0008_alter_imagemoderationrule_metric"),
    ]

    operations = [
        migrations.AddField(
            model_name="chat",
            name="chat_type",
            field=models.CharField(
                choices=[("direct", "Direct"), ("housing_group", "Housing group search")],
                db_index=True,
                default="direct",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="chat",
            name="invite_token",
            field=models.UUIDField(blank=True, editable=False, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="message",
            name="message_kind",
            field=models.CharField(
                choices=[("text", "Text"), ("listing", "Listing card")],
                db_index=True,
                default="text",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="message",
            name="listing_preview",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="message",
            name="listing",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="chat_messages",
                to="listings.listing",
            ),
        ),
        migrations.AlterField(
            model_name="message",
            name="text",
            field=models.TextField(blank=True, default=""),
        ),
    ]
