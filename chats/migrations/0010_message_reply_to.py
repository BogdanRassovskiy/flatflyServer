# Message.reply_to: self-FK must exist in Django state so deletes order correctly.
# Some DBs already had reply_to_id without a matching migration — add column only if missing.

from django.db import migrations, models
import django.db.models.deletion


def _reply_to_column_exists(schema_editor):
    table = "chats_message"
    conn = schema_editor.connection
    with conn.cursor() as cursor:
        if conn.vendor == "sqlite":
            cursor.execute(f'PRAGMA table_info("{table}")')
            return any(row[1] == "reply_to_id" for row in cursor.fetchall())
        if conn.vendor == "postgresql":
            cursor.execute(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = %s
                  AND column_name = 'reply_to_id'
                """,
                [table],
            )
            return cursor.fetchone() is not None
        if conn.vendor == "mysql":
            cursor.execute(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = %s
                  AND column_name = 'reply_to_id'
                """,
                [table],
            )
            return cursor.fetchone() is not None
    return False


def ensure_reply_to_column(apps, schema_editor):
    if _reply_to_column_exists(schema_editor):
        return
    from chats.models import Message

    field = Message._meta.get_field("reply_to")
    schema_editor.add_field(Message, field)


class Migration(migrations.Migration):

    dependencies = [
        ("chats", "0009_chat_housing_group_fields_message_listing"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="message",
                    name="reply_to",
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="replies",
                        to="chats.message",
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(ensure_reply_to_column, migrations.RunPython.noop),
            ],
        ),
    ]
