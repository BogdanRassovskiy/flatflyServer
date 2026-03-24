from django.db import models
from django.conf import settings


class Chat(models.Model):
    chatid = models.AutoField(primary_key=True)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='chats')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chat {self.chatid}"

class Message(models.Model):
    chat = models.ForeignKey(Chat, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='messages', on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Message {self.id} in Chat {self.chat.chatid}"


class ChatBlock(models.Model):
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="chat_blocks_created",
        on_delete=models.CASCADE,
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="chat_blocks_received",
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["blocker", "blocked"],
                name="uniq_chat_block_pair",
            ),
        ]

    def __str__(self):
        return f"{self.blocker_id} blocked {self.blocked_id}"


class ChatReport(models.Model):
    REASON_INSULT = "insult"
    REASON_THREAT = "threat"
    REASON_SPAM = "spam"
    REASON_FRAUD = "fraud"
    REASON_INAPPROPRIATE = "inappropriate_content"
    REASON_OTHER = "other"

    REASON_CHOICES = [
        (REASON_INSULT, "Оскорбление"),
        (REASON_THREAT, "Угроза"),
        (REASON_SPAM, "Спам"),
        (REASON_FRAUD, "Мошенничество"),
        (REASON_INAPPROPRIATE, "Неприемлемый контент"),
        (REASON_OTHER, "Другое"),
    ]
    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Ожидает"),
        (STATUS_APPROVED, "Подтверждена"),
        (STATUS_REJECTED, "Отклонена"),
    ]

    chat = models.ForeignKey(Chat, related_name="reports", on_delete=models.CASCADE)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="chat_reports_created",
        on_delete=models.CASCADE,
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="chat_reports_received",
        on_delete=models.CASCADE,
    )
    reason = models.CharField(max_length=64, choices=REASON_CHOICES)
    details = models.TextField(blank=True, default="")
    consent_confirmed = models.BooleanField(default=False)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
    resolution_note = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="chat_reports_reviewed",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    strike_applied = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Report {self.id}: {self.reporter_id} -> {self.reported_user_id}"


class ModerationMessage(models.Model):
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="moderation_messages_received",
        on_delete=models.CASCADE,
    )
    message = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="moderation_messages_created",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    sent_at = models.DateTimeField(auto_now_add=True)
    linked_chat = models.ForeignKey(
        Chat,
        related_name="moderation_messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    linked_message = models.ForeignKey(
        Message,
        related_name="moderation_messages",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ["-sent_at", "-id"]

    def __str__(self):
        return f"ModerationMessage #{self.id} to user {self.target_user_id}"


class RejectedImageModerationLog(models.Model):
    SOURCE_AVATAR = "avatar"
    SOURCE_LISTING = "listing"
    SOURCE_CHOICES = [
        (SOURCE_AVATAR, "Avatar"),
        (SOURCE_LISTING, "Listing image"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="rejected_image_logs",
        on_delete=models.CASCADE,
    )
    listing = models.ForeignKey(
        "listings.Listing",
        related_name="rejected_image_logs",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    source = models.CharField(max_length=32, choices=SOURCE_CHOICES)
    reasons = models.JSONField(default=list, blank=True)
    raw_scores = models.JSONField(default=dict, blank=True)
    provider = models.CharField(max_length=64, default="google_vision")
    raw_labels = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"RejectedImageModerationLog #{self.id} ({self.source}) user={self.user_id}"
