from urllib.parse import urlencode

from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.db import transaction
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html, format_html_join

from .models import Chat, Message, ChatBlock, ChatReport, ModerationMessage, RejectedImageModerationLog, ImageModerationRule

User = get_user_model()


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ("chatid", "created_at")
    search_fields = ("chatid",)
    filter_horizontal = ("participants",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "chat", "sender", "created_at", "is_read")
    list_filter = ("is_read", "created_at")
    search_fields = ("text", "sender__username", "sender__email")
    autocomplete_fields = ("chat", "sender")


@admin.register(ChatBlock)
class ChatBlockAdmin(admin.ModelAdmin):
    list_display = ("id", "blocker", "blocked", "created_at")
    list_filter = ("created_at",)
    search_fields = ("blocker__username", "blocker__email", "blocked__username", "blocked__email")


@admin.register(ChatReport)
class ChatReportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "chat",
        "reporter",
        "reported_user",
        "reason",
        "status",
        "strike_applied",
        "open_chat_messages",
        "created_at",
    )
    list_filter = ("reason", "status", "consent_confirmed", "strike_applied", "created_at")
    search_fields = (
        "reporter__username",
        "reporter__email",
        "reported_user__username",
        "reported_user__email",
        "details",
    )
    readonly_fields = (
        "chat",
        "reporter",
        "reported_user",
        "reason",
        "details",
        "consent_confirmed",
        "created_at",
        "reviewed_by",
        "reviewed_at",
        "strike_applied",
        "open_chat_messages",
        "chat_transcript_preview",
    )
    fields = (
        "chat",
        "reporter",
        "reported_user",
        "reason",
        "details",
        "consent_confirmed",
        "status",
        "resolution_note",
        "strike_applied",
        "reviewed_by",
        "reviewed_at",
        "open_chat_messages",
        "chat_transcript_preview",
        "created_at",
    )
    actions = ("approve_reports", "reject_reports")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("chat", "reporter__profile", "reported_user__profile")

    @admin.display(description="Переписка")
    def open_chat_messages(self, obj):
        url = reverse("admin:chats_message_changelist")
        query = urlencode({"chat__chatid__exact": obj.chat_id})
        return format_html('<a href="{}?{}" target="_blank">Открыть сообщения чата</a>', url, query)

    @admin.display(description="Превью переписки")
    def chat_transcript_preview(self, obj):
        rows = list(obj.chat.messages.select_related("sender").order_by("-created_at")[:30])
        if not rows:
            return "Сообщений нет"

        # Show oldest -> newest in a compact chat-like UI.
        rows = list(reversed(rows))
        bubbles = []
        for msg in rows:
            is_reporter = msg.sender_id == obj.reporter_id
            align_style = "justify-content:flex-end;" if is_reporter else "justify-content:flex-start;"
            bubble_style = (
                "max-width:78%;padding:8px 10px;border-radius:12px;"
                "background:#e9d5ff;color:#2e1065;border:1px solid #d8b4fe;"
                if is_reporter
                else "max-width:78%;padding:8px 10px;border-radius:12px;"
                     "background:#f3f4f6;color:#111827;border:1px solid #e5e7eb;"
            )
            sender_name = msg.sender.get_username() or f"user#{msg.sender_id}"
            sender_role = "Репортер" if is_reporter else "Пользователь"
            text = (msg.text[:240] + " ...") if len(msg.text) > 240 else msg.text
            bubbles.append(
                format_html(
                    '<div style="display:flex;{}margin:6px 0;">'
                    '<div style="{}">'
                    '<div style="font-size:11px;opacity:.75;margin-bottom:3px;">{} ({}) • {}</div>'
                    '<div style="white-space:pre-wrap;word-break:break-word;">{}</div>'
                    "</div></div>",
                    align_style,
                    bubble_style,
                    sender_name,
                    sender_role,
                    timezone.localtime(msg.created_at).strftime("%Y-%m-%d %H:%M"),
                    text,
                )
            )

        url = reverse("admin:chats_message_changelist")
        query = urlencode({"chat__chatid__exact": obj.chat_id})
        full_chat_link = format_html(
            '<a href="{}?{}" target="_blank" style="display:inline-block;margin-bottom:8px;'
            'padding:6px 10px;border-radius:8px;background:#111827;color:#ffffff;'
            'text-decoration:none;font-size:12px;">Открыть полный чат</a>',
            url,
            query,
        )

        return format_html(
            '<div style="border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;padding:8px;">'
            '{}'
            '<div style="max-height:340px;overflow:auto;">{}</div>'
            "</div>",
            full_chat_link,
            format_html_join("", "{}", ((bubble,) for bubble in bubbles)),
        )

    @transaction.atomic
    def _apply_strike(self, report: ChatReport, moderator):
        if report.strike_applied:
            return False, False

        profile = getattr(report.reported_user, "profile", None)
        if not profile:
            return False, False

        profile.moderation_strikes = int(profile.moderation_strikes or 0) + 1
        profile.save(update_fields=["moderation_strikes"])

        banned = False
        if profile.moderation_strikes >= 3 and report.reported_user.is_active:
            report.reported_user.is_active = False
            report.reported_user.save(update_fields=["is_active"])
            banned = True

        report.strike_applied = True
        report.reviewed_by = moderator
        report.reviewed_at = timezone.now()
        report.status = ChatReport.STATUS_APPROVED
        report.save(update_fields=["strike_applied", "reviewed_by", "reviewed_at", "status"])
        return True, banned

    @admin.action(description="Подтвердить жалобу (дать страйк)")
    def approve_reports(self, request, queryset):
        applied = 0
        banned_count = 0
        for report in queryset.select_for_update():
            changed, banned = self._apply_strike(report, request.user)
            if changed:
                applied += 1
            if banned:
                banned_count += 1
        self.message_user(
            request,
            f"Подтверждено: {applied}. Автобан (3 страйка): {banned_count}.",
            level=messages.SUCCESS,
        )

    @admin.action(description="Отклонить жалобу (без страйка)")
    def reject_reports(self, request, queryset):
        updated = queryset.update(
            status=ChatReport.STATUS_REJECTED,
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(request, f"Отклонено жалоб: {updated}.", level=messages.INFO)

    def save_model(self, request, obj, form, change):
        if change and "status" in form.changed_data:
            if obj.status == ChatReport.STATUS_APPROVED:
                super().save_model(request, obj, form, change)
                changed, banned = self._apply_strike(obj, request.user)
                if changed:
                    msg = "Жалоба подтверждена, страйк выдан."
                    if banned:
                        msg += " Пользователь автоматически заблокирован (3 страйка)."
                    self.message_user(request, msg, level=messages.SUCCESS)
            elif obj.status == ChatReport.STATUS_REJECTED:
                obj.reviewed_by = request.user
                obj.reviewed_at = timezone.now()
                super().save_model(request, obj, form, change)
            else:
                super().save_model(request, obj, form, change)
        else:
            super().save_model(request, obj, form, change)


@admin.register(ModerationMessage)
class ModerationMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "target_user", "created_by", "sent_at", "chat_link")
    search_fields = ("target_user__username", "target_user__email", "message")
    readonly_fields = ("created_by", "sent_at", "linked_chat", "linked_message", "chat_link")
    autocomplete_fields = ("target_user",)
    fields = ("target_user", "message", "created_by", "sent_at", "linked_chat", "linked_message", "chat_link")

    @admin.display(description="Чат")
    def chat_link(self, obj):
        if not obj.linked_chat_id:
            return "-"
        url = reverse("admin:chats_chat_change", args=[obj.linked_chat_id])
        return format_html('<a href="{}">Chat #{}</a>', url, obj.linked_chat_id)

    def save_model(self, request, obj, form, change):
        obj.created_by = request.user
        if change:
            return super().save_model(request, obj, form, change)

        support_user, _ = User.objects.get_or_create(
            username="support",
            defaults={
                "email": "support@flatfly.local",
                "is_staff": True,
                "is_active": True,
            },
        )

        chat = (
            Chat.objects
            .filter(participants=support_user)
            .filter(participants=obj.target_user)
            .first()
        )
        if not chat:
            chat = Chat.objects.create()
            chat.participants.add(support_user, obj.target_user)

        msg = Message.objects.create(
            chat=chat,
            sender=support_user,
            text=obj.message,
        )
        obj.linked_chat = chat
        obj.linked_message = msg
        super().save_model(request, obj, form, change)


@admin.register(RejectedImageModerationLog)
class RejectedImageModerationLogAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at", "user", "source", "listing", "provider", "reasons_preview")
    list_filter = ("source", "provider", "created_at")
    search_fields = ("user__username", "user__email", "listing__title")
    readonly_fields = ("created_at", "user", "source", "listing", "provider", "reasons", "raw_scores", "raw_labels")

    @admin.display(description="Reasons")
    def reasons_preview(self, obj):
        return ", ".join(obj.reasons[:4]) if obj.reasons else "-"


@admin.register(ImageModerationRule)
class ImageModerationRuleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_active", "provider", "metric", "threshold", "reasons_preview", "updated_at")
    list_filter = ("is_active", "provider", "metric")
    search_fields = ("name",)
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Reasons")
    def reasons_preview(self, obj):
        return ", ".join(obj.reasons[:4]) if obj.reasons else "-"
