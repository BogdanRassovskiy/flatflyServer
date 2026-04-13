from rest_framework import serializers
from .models import Chat, Message, ChatBlock
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    profile_id = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "display_name", "profile_id", "avatar")

    def get_display_name(self, obj):
        profile_name = getattr(getattr(obj, "profile", None), "name", "") or ""
        if profile_name.strip():
            return profile_name.strip()

        full_name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        if full_name:
            return full_name

        return ""

    def get_profile_id(self, obj):
        profile = getattr(obj, "profile", None)
        return getattr(profile, "id", None)

    def get_avatar(self, obj):
        profile = getattr(obj, "profile", None)
        avatar = getattr(profile, "avatar", None)
        if not avatar:
            return None

        request = self.context.get("request")
        avatar_url = avatar.url
        return request.build_absolute_uri(avatar_url) if request else avatar_url


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    display_text = serializers.SerializerMethodField()
    listing_id = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id",
            "chat",
            "sender",
            "text",
            "created_at",
            "is_read",
            "message_kind",
            "listing_id",
            "listing_preview",
            "display_text",
        )

    def get_listing_id(self, obj):
        return obj.listing_id

    def get_display_text(self, obj):
        if obj.message_kind == Message.KIND_LISTING and obj.listing_preview:
            title = obj.listing_preview.get("title") or ""
            if title:
                return title
            if obj.listing_id:
                return f"Listing #{obj.listing_id}"
        return obj.text or ""


class ChatSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    last_activity_at = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()
    blocked_by_me = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = (
            "chatid",
            "chat_type",
            "invite_token",
            "participants",
            "participant_count",
            "created_at",
            "last_message",
            "unread_count",
            "last_activity_at",
            "is_blocked",
            "blocked_by_me",
        )

    def get_participant_count(self, obj):
        return obj.participants.count()

    def get_last_message(self, obj):
        last = obj.messages.order_by("-created_at").first()
        return MessageSerializer(last, context=self.context).data if last else None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()

    def get_last_activity_at(self, obj):
        last = obj.messages.order_by("-created_at").first()
        return last.created_at if last else obj.created_at

    def get_is_blocked(self, obj):
        if obj.chat_type == Chat.CHAT_TYPE_HOUSING_GROUP:
            return False
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        participant_ids = list(obj.participants.values_list("id", flat=True))
        other_ids = [uid for uid in participant_ids if uid != request.user.id]
        if not other_ids:
            return False
        return ChatBlock.objects.filter(
            blocker_id__in=[request.user.id, *other_ids],
            blocked_id__in=[request.user.id, *other_ids],
        ).exists()

    def get_blocked_by_me(self, obj):
        if obj.chat_type == Chat.CHAT_TYPE_HOUSING_GROUP:
            return False
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        participant_ids = list(obj.participants.values_list("id", flat=True))
        other_ids = [uid for uid in participant_ids if uid != request.user.id]
        if not other_ids:
            return False
        return ChatBlock.objects.filter(blocker=request.user, blocked_id__in=other_ids).exists()
