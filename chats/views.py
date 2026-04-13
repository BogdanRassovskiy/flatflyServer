import uuid

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Chat, Message, ChatBlock, ChatReport
from .serializers import ChatSerializer, MessageSerializer, UserSerializer
from .utils import listing_to_preview_dict
from django.contrib.auth import get_user_model
from rest_framework.generics import get_object_or_404
from django.db.models import Count, Max
from rest_framework.exceptions import ValidationError, PermissionDenied
from users.models import Profile
from listings.models import Listing

User = get_user_model()
MESSAGES_PAGE_SIZE = 10
HOUSING_GROUP_MAX_MEMBERS = 6


def _share_listing_message(chat, user, listing, request):
    preview = listing_to_preview_dict(listing, request)
    return Message.objects.create(
        chat=chat,
        sender=user,
        text="",
        message_kind=Message.KIND_LISTING,
        listing=listing,
        listing_preview=preview,
    )


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

    def destroy(self, request, *args, **kwargs):
        chat = self.get_object()
        if request.user not in chat.participants.all():
            return Response(status=status.HTTP_403_FORBIDDEN)
        if chat.chat_type == Chat.CHAT_TYPE_HOUSING_GROUP:
            if chat.participants.count() != 1:
                return Response(
                    {
                        "detail": "A housing group can be deleted only when you are the last member.",
                        "code": "housing_group_delete_requires_solo",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        blocked_by_current_user = ChatBlock.objects.filter(
            blocker=self.request.user,
        ).values_list('blocked_id', flat=True)
        blocked_current_user = ChatBlock.objects.filter(
            blocked=self.request.user,
        ).values_list('blocker_id', flat=True)

        blocked_ids = list(blocked_by_current_user) + list(blocked_current_user)

        queryset = (
            Chat.objects
            .filter(participants=self.request.user)
            .prefetch_related('participants__profile')
            .annotate(last_message_at=Max('messages__created_at'))
            .order_by('-last_message_at', '-created_at')
        )
        if blocked_ids:
            queryset = queryset.exclude(participants__id__in=blocked_ids)
        return queryset

    @staticmethod
    def _get_other_participant(chat, current_user_id):
        return chat.participants.exclude(id=current_user_id).first()

    @staticmethod
    def _is_blocked_between_users(first_user_id, second_user_id):
        return ChatBlock.objects.filter(
            blocker_id__in=[first_user_id, second_user_id],
            blocked_id__in=[first_user_id, second_user_id],
        ).exists()

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        chat = self.get_object()
        is_housing_group = chat.chat_type == Chat.CHAT_TYPE_HOUSING_GROUP
        other_participant = self._get_other_participant(chat, request.user.id)
        if not is_housing_group:
            if other_participant and self._is_blocked_between_users(request.user.id, other_participant.id):
                return Response({'detail': 'Chat is blocked'}, status=status.HTTP_403_FORBIDDEN)
        participant_ids = list(chat.participants.values_list('id', flat=True))
        other_participant_ids = [uid for uid in participant_ids if uid != request.user.id]
        if is_housing_group:
            can_send_message = True
            awaiting_reply = False
        else:
            has_reply_from_other = chat.messages.filter(sender_id__in=other_participant_ids).exists() if other_participant_ids else False
            my_messages_count = chat.messages.filter(sender=request.user).count()
            can_send_message = has_reply_from_other or my_messages_count == 0
            awaiting_reply = not has_reply_from_other and my_messages_count > 0

        chat.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        base_queryset = chat.messages.select_related('sender__profile', 'listing')
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
        if self._is_blocked_between_users(self.request.user.id, target_user.id):
            return Response({'error': 'You cannot start chat with this user'}, status=403)

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
        return Response(ChatSerializer(chat, context={'request': request}).data)

    @action(detail=False, methods=['post'])
    def block(self, request):
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return Response({'error': 'user_id is required'}, status=400)

        try:
            target_user_id = int(target_user_id)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid user_id'}, status=400)

        if target_user_id == request.user.id:
            return Response({'error': 'You cannot block yourself'}, status=400)

        target_user = get_object_or_404(User, id=target_user_id)
        ChatBlock.objects.get_or_create(blocker=request.user, blocked=target_user)
        return Response({'status': 'blocked'})

    @action(detail=False, methods=['post'])
    def unblock(self, request):
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return Response({'error': 'user_id is required'}, status=400)

        try:
            target_user_id = int(target_user_id)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid user_id'}, status=400)

        ChatBlock.objects.filter(blocker=request.user, blocked_id=target_user_id).delete()
        return Response({'status': 'unblocked'})

    @action(detail=False, methods=['get'])
    def blacklist(self, request):
        blocked_users = User.objects.filter(
            id__in=ChatBlock.objects.filter(blocker=request.user).values_list('blocked_id', flat=True)
        ).select_related('profile')
        return Response(UserSerializer(blocked_users, many=True, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def report(self, request, pk=None):
        chat = self.get_object()
        if chat.chat_type == Chat.CHAT_TYPE_HOUSING_GROUP:
            return Response({'error': 'Reporting is not available for group chats'}, status=400)
        other_participant = self._get_other_participant(chat, request.user.id)
        if not other_participant:
            return Response({'error': 'No target user found'}, status=400)

        reason = str(request.data.get('reason') or '').strip()
        details = str(request.data.get('details') or '').strip()
        consent_confirmed = bool(request.data.get('consent_confirmed'))
        block_user = bool(request.data.get('block_user'))

        allowed_reasons = {choice[0] for choice in ChatReport.REASON_CHOICES}
        if reason not in allowed_reasons:
            return Response({'error': 'Invalid reason'}, status=400)

        if not consent_confirmed:
            return Response({'error': 'Consent confirmation is required'}, status=400)

        report = ChatReport.objects.create(
            chat=chat,
            reporter=request.user,
            reported_user=other_participant,
            reason=reason,
            details=details,
            consent_confirmed=True,
        )
        blocked = False
        if block_user and other_participant.id != request.user.id:
            _, created = ChatBlock.objects.get_or_create(blocker=request.user, blocked=other_participant)
            blocked = created or ChatBlock.objects.filter(blocker=request.user, blocked=other_participant).exists()

        return Response({'status': 'reported', 'report_id': report.id, 'blocked': blocked})

    @action(detail=False, methods=['post'], url_path='create-housing-group')
    def create_housing_group(self, request):
        existing = (
            Chat.objects.filter(chat_type=Chat.CHAT_TYPE_HOUSING_GROUP, participants=request.user)
            .prefetch_related('participants__profile')
            .first()
        )
        if existing:
            return Response(
                {
                    "code": "already_in_group",
                    "chat": ChatSerializer(existing, context={'request': request}).data,
                },
                status=status.HTTP_409_CONFLICT,
            )

        chat = Chat.objects.create(chat_type=Chat.CHAT_TYPE_HOUSING_GROUP)
        chat.participants.add(request.user)

        listing_id = request.data.get('listing_id')
        if listing_id is not None and listing_id != '':
            try:
                lid = int(listing_id)
            except (TypeError, ValueError):
                return Response({'detail': 'Invalid listing_id'}, status=status.HTTP_400_BAD_REQUEST)
            listing = get_object_or_404(Listing, pk=lid, is_active=True)
            _share_listing_message(chat, request.user, listing, request)

        chat = (
            Chat.objects.filter(pk=chat.pk)
            .prefetch_related('participants__profile')
            .first()
        )
        return Response(ChatSerializer(chat, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='join-housing-group')
    def join_housing_group(self, request):
        raw_token = request.data.get('invite_token')
        if not raw_token:
            return Response({'detail': 'invite_token is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = uuid.UUID(str(raw_token))
        except (ValueError, TypeError, AttributeError):
            return Response({'detail': 'Invalid invite_token'}, status=status.HTTP_400_BAD_REQUEST)

        chat = (
            Chat.objects.filter(chat_type=Chat.CHAT_TYPE_HOUSING_GROUP, invite_token=token)
            .prefetch_related('participants__profile')
            .first()
        )
        if not chat:
            return Response({'detail': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.user in chat.participants.all():
            return Response(ChatSerializer(chat, context={'request': request}).data)

        if chat.participants.count() >= HOUSING_GROUP_MAX_MEMBERS:
            return Response(
                {'detail': 'This group is full (6 members).', 'code': 'group_full'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        other_group = (
            Chat.objects.filter(chat_type=Chat.CHAT_TYPE_HOUSING_GROUP, participants=request.user)
            .exclude(chatid=chat.chatid)
            .first()
        )
        if other_group:
            return Response(
                {
                    'code': 'already_in_group',
                    'chatid': other_group.chatid,
                    'detail': 'Leave your current group before joining another.',
                },
                status=status.HTTP_409_CONFLICT,
            )

        chat.participants.add(request.user)
        chat = Chat.objects.filter(pk=chat.pk).prefetch_related('participants__profile').first()
        return Response(ChatSerializer(chat, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='leave-housing-group')
    def leave_housing_group(self, request, pk=None):
        chat = self.get_object()
        if chat.chat_type != Chat.CHAT_TYPE_HOUSING_GROUP:
            return Response({'detail': 'Not a housing group chat'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user not in chat.participants.all():
            return Response(status=status.HTTP_403_FORBIDDEN)
        if chat.participants.count() <= 1:
            return Response(
                {
                    'detail': 'The last member cannot leave; delete the group instead.',
                    'code': 'last_member_cannot_leave',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        chat.participants.remove(request.user)
        return Response({'status': 'left'})

    @action(detail=True, methods=['post'], url_path='share-listing')
    def share_listing(self, request, pk=None):
        chat = self.get_object()
        if chat.chat_type != Chat.CHAT_TYPE_HOUSING_GROUP:
            return Response({'detail': 'Not a housing group chat'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user not in chat.participants.all():
            return Response(status=status.HTTP_403_FORBIDDEN)

        listing_id = request.data.get('listing_id')
        try:
            lid = int(listing_id)
        except (TypeError, ValueError):
            return Response({'detail': 'listing_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        listing = get_object_or_404(Listing, pk=lid, is_active=True)
        msg = _share_listing_message(chat, request.user, listing, request)
        return Response(MessageSerializer(msg, context={'request': request}).data, status=status.HTTP_201_CREATED)

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
            raise PermissionDenied('Not a participant of this chat')

        is_housing_group = chat.chat_type == Chat.CHAT_TYPE_HOUSING_GROUP
        if not is_housing_group:
            other_participant = chat.participants.exclude(id=self.request.user.id).first()
            if other_participant and ChatViewSet._is_blocked_between_users(self.request.user.id, other_participant.id):
                raise ValidationError({
                    'code': 'blocked',
                    'detail': 'You cannot send messages in this chat.',
                })

        if not is_housing_group:
            participant_ids = list(chat.participants.values_list('id', flat=True))
            other_participant_ids = [uid for uid in participant_ids if uid != self.request.user.id]
            has_reply_from_other = chat.messages.filter(sender_id__in=other_participant_ids).exists() if other_participant_ids else False
            my_messages_count = chat.messages.filter(sender=self.request.user).count()

            if not has_reply_from_other and my_messages_count >= 1:
                raise ValidationError({
                    'code': 'awaiting_reply',
                    'detail': 'You can send only one message until the other participant replies.',
                })

        text = (serializer.validated_data.get('text') or '').strip()
        if not text:
            raise ValidationError({
                'detail': 'Message text cannot be empty.',
                'text': ['This field may not be blank.'],
            })

        serializer.save(sender=self.request.user, chat=chat, message_kind=Message.KIND_TEXT)
