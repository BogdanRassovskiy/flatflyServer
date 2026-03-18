from rest_framework import serializers
from .models import Chat, Message
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    profile_id = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'display_name', 'profile_id', 'avatar')

    def get_display_name(self, obj):
        profile_name = getattr(getattr(obj, 'profile', None), 'name', '') or ''
        if profile_name.strip():
            return profile_name.strip()

        full_name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        if full_name:
            return full_name

        return ''

    def get_profile_id(self, obj):
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'id', None)

    def get_avatar(self, obj):
        profile = getattr(obj, 'profile', None)
        avatar = getattr(profile, 'avatar', None)
        if not avatar:
            return None

        request = self.context.get('request')
        avatar_url = avatar.url
        return request.build_absolute_uri(avatar_url) if request else avatar_url

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    class Meta:
        model = Message
        fields = ('id', 'chat', 'sender', 'text', 'created_at', 'is_read')

class ChatSerializer(serializers.ModelSerializer):
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    last_activity_at = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = ('chatid', 'participants', 'created_at', 'last_message', 'unread_count', 'last_activity_at')

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        return MessageSerializer(last, context=self.context).data if last else None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        return obj.messages.filter(is_read=False).exclude(sender=request.user).count()

    def get_last_activity_at(self, obj):
        last = obj.messages.order_by('-created_at').first()
        return (last.created_at if last else obj.created_at)
