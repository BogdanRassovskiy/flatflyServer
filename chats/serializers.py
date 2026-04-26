from rest_framework import serializers
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import Chat, Message, ChatBlock, ListingCardReaction
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


LISTING_RATING_UI_SLOTS = 6


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    display_text = serializers.SerializerMethodField()
    listing_id = serializers.SerializerMethodField()
    listing_ratings = serializers.SerializerMethodField()
    reply_preview = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = (
            "id",
            "chat",
            "sender",
            "text",
            "created_at",
            "edited_at",
            "is_read",
            "message_kind",
            "listing_id",
            "listing_preview",
            "display_text",
            "listing_ratings",
            "reply_preview",
            "can_edit",
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

    def get_listing_ratings(self, obj):
        if obj.message_kind != Message.KIND_LISTING:
            return None
        request = self.context.get("request")
        stats = ListingCardReaction.objects.filter(message=obj).aggregate(
            likes=Count("id", filter=Q(is_like=True)),
            dislikes=Count("id", filter=Q(is_like=False)),
        )
        prefetched = getattr(obj, "_prefetched_objects_cache", None)
        if prefetched and "listing_reactions" in prefetched:
            reactions = sorted(obj.listing_reactions.all(), key=lambda r: r.updated_at, reverse=True)[
                :LISTING_RATING_UI_SLOTS
            ]
        else:
            reactions = list(
                ListingCardReaction.objects.filter(message=obj)
                .select_related("user__profile")
                .order_by("-updated_at")[:LISTING_RATING_UI_SLOTS]
            )
        voters = []
        for r in reactions:
            voters.append(
                {
                    "user_id": r.user_id,
                    "is_like": r.is_like,
                    "avatar": UserSerializer(r.user, context=self.context).data.get("avatar"),
                    "display_name": UserSerializer(r.user, context=self.context).data.get("display_name"),
                }
            )
        my_vote = None
        if request and request.user.is_authenticated:
            row = ListingCardReaction.objects.filter(message=obj, user=request.user).first()
            if row:
                my_vote = row.is_like
        return {
            "my_vote": my_vote,
            "voters": voters,
            "like_count": stats["likes"] or 0,
            "dislike_count": stats["dislikes"] or 0,
        }

    def get_reply_preview(self, obj):
        ref = getattr(obj, "reply_to", None)
        if ref is None:
            return None
        sender_data = UserSerializer(ref.sender, context=self.context).data
        sender_name = (sender_data.get("display_name") or "").strip()
        if not sender_name:
            u = ref.sender
            sender_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or ""
        out = {
            "id": ref.id,
            "message_kind": ref.message_kind,
            "sender_name": sender_name,
            "text_snippet": "",
            "listing_thumb": None,
        }
        if ref.message_kind == Message.KIND_LISTING:
            lp = ref.listing_preview if isinstance(ref.listing_preview, dict) else {}
            title = (lp.get("title") or "").strip()
            out["text_snippet"] = title or (f"Listing #{ref.listing_id}" if ref.listing_id else "")
            images = lp.get("images")
            thumb = None
            if isinstance(images, list) and images:
                thumb = images[0]
            elif lp.get("image"):
                thumb = lp["image"]
            out["listing_thumb"] = thumb
        else:
            out["text_snippet"] = ((ref.text or "").strip())[:280]
        return out

    def get_can_edit(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if obj.sender_id != request.user.id:
            return False
        if obj.message_kind != Message.KIND_TEXT:
            return False
        return obj.created_at >= timezone.now() - timedelta(minutes=5)


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
