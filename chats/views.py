from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Chat, Message
from .serializers import ChatSerializer, MessageSerializer
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.generics import get_object_or_404
from django.db.models import Count, Max
from rest_framework.exceptions import ValidationError
from users.models import Profile

User = get_user_model()
MESSAGES_PAGE_SIZE = 10


def _parse_positive_int(raw_value, default_value):
    try:
        parsed = int(raw_value)
    except (TypeError, ValueError):
        return default_value

    return parsed if parsed >= 0 else default_value

class ChatViewSet(viewsets.ModelViewSet):
    queryset = Chat.objects.all().prefetch_related('participants__profile')
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Chat.objects
            .filter(participants=self.request.user)
            .prefetch_related('participants__profile')
            .annotate(last_message_at=Max('messages__created_at'))
            .order_by('-last_message_at', '-created_at')
        )

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        chat = self.get_object()
        participant_ids = list(chat.participants.values_list('id', flat=True))
        other_participant_ids = [uid for uid in participant_ids if uid != request.user.id]
        has_reply_from_other = chat.messages.filter(sender_id__in=other_participant_ids).exists() if other_participant_ids else False
        my_messages_count = chat.messages.filter(sender=request.user).count()
        can_send_message = has_reply_from_other or my_messages_count == 0
        awaiting_reply = not has_reply_from_other and my_messages_count > 0

        chat.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        base_queryset = chat.messages.select_related('sender__profile')
        after_id = _parse_positive_int(request.query_params.get('after_id'), 0)

        if after_id > 0:
            messages = base_queryset.filter(id__gt=after_id).order_by('created_at', 'id')
            serializer = MessageSerializer(messages, many=True, context={'request': request})
            return Response({
                'results': serializer.data,
                'has_more': False,
                'next_offset': None,
                'total_count': None,
                'can_send_message': can_send_message,
                'awaiting_reply': awaiting_reply,
            })

        limit = min(_parse_positive_int(request.query_params.get('limit'), MESSAGES_PAGE_SIZE), 50) or MESSAGES_PAGE_SIZE
        offset = _parse_positive_int(request.query_params.get('offset'), 0)
        total_count = base_queryset.count()
        messages = list(base_queryset.order_by('-created_at', '-id')[offset:offset + limit])
        messages.reverse()
        serializer = MessageSerializer(messages, many=True, context={'request': request})

        loaded_count = len(messages)
        next_offset = offset + loaded_count if offset + loaded_count < total_count else None

        return Response({
            'results': serializer.data,
            'has_more': next_offset is not None,
            'next_offset': next_offset,
            'total_count': total_count,
            'can_send_message': can_send_message,
            'awaiting_reply': awaiting_reply,
        })

    @action(detail=False, methods=['post'])
    def start(self, request):
        user_ids = request.data.get('user_ids', [])
        single_user_id = request.data.get('user_id')
        profile_id = request.data.get('profile_id')

        if single_user_id and not user_ids:
            user_ids = [single_user_id]

        if profile_id and not user_ids:
            profile = get_object_or_404(Profile, id=profile_id)
            user_ids = [profile.user_id]

        try:
            user_ids = [int(uid) for uid in user_ids]
        except (TypeError, ValueError):
            return Response({'error': 'Invalid user_ids'}, status=400)

        user_ids = [uid for uid in user_ids if uid != self.request.user.id]
        if len(user_ids) != 1:
            return Response({'error': 'Exactly one target user is required'}, status=400)

        target_user = get_object_or_404(User, id=user_ids[0])

        existing_chat = (
            Chat.objects
            .filter(participants=self.request.user)
            .filter(participants=target_user)
            .annotate(participants_count=Count('participants'))
            .filter(participants_count=2)
            .first()
        )

        if existing_chat:
            return Response(ChatSerializer(existing_chat).data)

        chat = Chat.objects.create()
        chat.participants.add(self.request.user, target_user)
        chat.save()
        return Response(ChatSerializer(chat).data)

class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all().select_related('sender__profile', 'chat')
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        chat_id = self.request.query_params.get('chatid')
        qs = Message.objects.filter(chat__participants=self.request.user)
        if chat_id:
            qs = qs.filter(chat_id=chat_id)
        return qs.order_by('created_at')

    def perform_create(self, serializer):
        chat = get_object_or_404(Chat, pk=self.request.data.get('chat'))
        if self.request.user not in chat.participants.all():
            raise PermissionError('Not a participant of this chat')

        participant_ids = list(chat.participants.values_list('id', flat=True))
        other_participant_ids = [uid for uid in participant_ids if uid != self.request.user.id]
        has_reply_from_other = chat.messages.filter(sender_id__in=other_participant_ids).exists() if other_participant_ids else False
        my_messages_count = chat.messages.filter(sender=self.request.user).count()

        if not has_reply_from_other and my_messages_count >= 1:
            raise ValidationError({
                'code': 'awaiting_reply',
                'detail': 'You can send only one message until the other participant replies.',
            })

        serializer.save(sender=self.request.user, chat=chat)
