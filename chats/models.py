from django.db import models
from django.conf import settings
import uuid


class Chat(models.Model):
    CHAT_TYPE_DIRECT = "direct"
    CHAT_TYPE_HOUSING_GROUP = "housing_group"
    CHAT_TYPE_CHOICES = [
        (CHAT_TYPE_DIRECT, "Direct"),
        (CHAT_TYPE_HOUSING_GROUP, "Housing group search"),
    ]

    chatid = models.AutoField(primary_key=True)
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='chats')
    created_at = models.DateTimeField(auto_now_add=True)
    chat_type = models.CharField(max_length=32, choices=CHAT_TYPE_CHOICES, default=CHAT_TYPE_DIRECT, db_index=True)
    invite_token = models.UUIDField(null=True, blank=True, unique=True, editable=False)

    def __str__(self):
        return f"Chat {self.chatid}"

    def save(self, *args, **kwargs):
        if self.chat_type == self.CHAT_TYPE_HOUSING_GROUP and not self.invite_token:
            self.invite_token = uuid.uuid4()
        super().save(*args, **kwargs)


class Message(models.Model):
    KIND_TEXT = "text"
    KIND_LISTING = "listing"
    KIND_CHOICES = [
        (KIND_TEXT, "Text"),
        (KIND_LISTING, "Listing card"),
    ]

    chat = models.ForeignKey(Chat, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='messages', on_delete=models.CASCADE)
    text = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    message_kind = models.CharField(max_length=32, choices=KIND_CHOICES, default=KIND_TEXT, db_index=True)
    listing = models.ForeignKey(
        "listings.Listing",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="chat_messages",
    )
    reply_to = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies",
    )
    listing_preview = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Message {self.id} in Chat {self.chat.chatid}"


class ListingCardReaction(models.Model):
    """Like/dislike on a listing card message in group chat (one vote per user per message)."""

    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="listing_reactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listing_card_reactions")
    is_like = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["message", "user"],
                name="uniq_listing_reaction_message_user",
            ),
        ]

    def __str__(self):
        return f"ListingReaction {self.message_id} user={self.user_id} like={self.is_like}"


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


class ImageModerationRule(models.Model):
    PROVIDER_LOCAL_OPENNSFW2 = "local_opennsfw2"
    PROVIDER_SIGHTENGINE = "sightengine"
    PROVIDER_CHOICES = [
        (PROVIDER_LOCAL_OPENNSFW2, "Local OpenNSFW2"),
        (PROVIDER_SIGHTENGINE, "Sightengine"),
    ]

    METRIC_NSFW_PROBABILITY = "nsfw_probability"
    METRIC_SIGHTENGINE_NUDITY_RAW = "nudity_raw"
    METRIC_SIGHTENGINE_NUDITY_PARTIAL = "nudity_partial"
    METRIC_SIGHTENGINE_NUDITY_SEXUAL_ACTIVITY = "nudity_sexual_activity"
    METRIC_SIGHTENGINE_NUDITY_SEXUAL_DISPLAY = "nudity_sexual_display"
    METRIC_SIGHTENGINE_NUDITY_EROTICA = "nudity_erotica"
    METRIC_SIGHTENGINE_NUDITY_SUGGESTIVE = "nudity_suggestive"
    METRIC_SIGHTENGINE_OFFENSIVE_NAZI = "offensive_nazi"
    METRIC_SIGHTENGINE_OFFENSIVE_TERRORIST = "offensive_terrorist"
    METRIC_SIGHTENGINE_OFFENSIVE_SUPREMACIST = "offensive_supremacist"
    METRIC_SIGHTENGINE_OFFENSIVE_OFFENSIVE = "offensive_offensive"
    METRIC_SIGHTENGINE_WEAPON = "weapon"
    METRIC_SIGHTENGINE_WEAPON_FIREARM = "weapon_firearm"
    METRIC_SIGHTENGINE_WEAPON_KNIFE = "weapon_knife"
    METRIC_SIGHTENGINE_GORE_PROB = "gore_prob"
    METRIC_SIGHTENGINE_DRUGS = "drugs"
    METRIC_SIGHTENGINE_RECREATIONAL_DRUGS = "recreational_drugs"
    METRIC_CHOICES = [
        (METRIC_NSFW_PROBABILITY, "NSFW probability"),
        (METRIC_SIGHTENGINE_NUDITY_RAW, "Sightengine nudity raw"),
        (METRIC_SIGHTENGINE_NUDITY_PARTIAL, "Sightengine nudity partial"),
        (METRIC_SIGHTENGINE_NUDITY_SEXUAL_ACTIVITY, "Sightengine nudity sexual activity"),
        (METRIC_SIGHTENGINE_NUDITY_SEXUAL_DISPLAY, "Sightengine nudity sexual display"),
        (METRIC_SIGHTENGINE_NUDITY_EROTICA, "Sightengine nudity erotica"),
        (METRIC_SIGHTENGINE_NUDITY_SUGGESTIVE, "Sightengine nudity suggestive"),
        (METRIC_SIGHTENGINE_OFFENSIVE_NAZI, "Sightengine offensive nazi"),
        (METRIC_SIGHTENGINE_OFFENSIVE_TERRORIST, "Sightengine offensive terrorist"),
        (METRIC_SIGHTENGINE_OFFENSIVE_SUPREMACIST, "Sightengine offensive supremacist"),
        (METRIC_SIGHTENGINE_OFFENSIVE_OFFENSIVE, "Sightengine offensive content"),
        (METRIC_SIGHTENGINE_WEAPON, "Sightengine weapon"),
        (METRIC_SIGHTENGINE_WEAPON_FIREARM, "Sightengine weapon firearm"),
        (METRIC_SIGHTENGINE_WEAPON_KNIFE, "Sightengine weapon knife"),
        (METRIC_SIGHTENGINE_GORE_PROB, "Sightengine gore prob"),
        (METRIC_SIGHTENGINE_DRUGS, "Sightengine drugs"),
        (METRIC_SIGHTENGINE_RECREATIONAL_DRUGS, "Sightengine recreational drugs"),
    ]

    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    provider = models.CharField(max_length=64, choices=PROVIDER_CHOICES, default=PROVIDER_LOCAL_OPENNSFW2)
    metric = models.CharField(max_length=64, choices=METRIC_CHOICES, default=METRIC_NSFW_PROBABILITY)
    threshold = models.FloatField(default=0.65)
    reasons = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_active", "provider", "metric", "threshold", "id"]

    def __str__(self):
        return f"{self.name} ({self.provider}:{self.metric} >= {self.threshold})"
