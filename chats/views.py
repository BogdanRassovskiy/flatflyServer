import uuid
import json
from django.conf import settings
from importlib import import_module

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Chat, Message, ChatBlock, ChatReport, ListingCardReaction
from .serializers import ChatSerializer, MessageSerializer, UserSerializer
from .telegram_link import (
    can_sign_telegram_links,
    find_telegram_link,
    sign_link_token,
    unlink_telegram,
    verify_link_token,
)
from .utils import listing_to_preview_dict
from django.contrib.auth import get_user_model
from rest_framework.generics import get_object_or_404
from django.db.models import Count, Max, Prefetch
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth import SESSION_KEY, BACKEND_SESSION_KEY, HASH_SESSION_KEY
from django.middleware.csrf import _get_new_csrf_string
import requests
from users.models import Profile
from listings.models import Listing

User = get_user_model()
MESSAGES_PAGE_SIZE = 10
HOUSING_GROUP_MAX_MEMBERS = 6


@csrf_exempt
@require_POST
def telegram_bot_session(request):
    """
    Exchange Telegram deep-link token for API session cookies for bot usage.
    """
    try:
        payload = request.body.decode("utf-8") if request.body else "{}"
        data = json.loads(payload or "{}")
    except Exception:
        return JsonResponse({"detail": "Invalid JSON"}, status=400)

    token = str(data.get("token") or "").strip()
    parsed = verify_link_token(token)
    if not parsed:
        return JsonResponse({"detail": "Invalid or expired token"}, status=400)

    site_user_id, _lang, _exp = parsed
    user = get_object_or_404(User, id=site_user_id)

    engine = import_module(settings.SESSION_ENGINE)
    SessionStore = engine.SessionStore
    session = SessionStore()
    session[SESSION_KEY] = str(user.pk)
    session[BACKEND_SESSION_KEY] = settings.AUTHENTICATION_BACKENDS[0]
    session[HASH_SESSION_KEY] = user.get_session_auth_hash()
    session["csrf_token"] = _get_new_csrf_string()
    session.save()

    csrf_token = _get_new_csrf_string()
    return JsonResponse(
        {
            "sessionid": session.session_key,
            "csrftoken": csrf_token,
            "user_id": user.pk,
        }
    )


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


LISTING_RATING_UI_SLOTS = 6


def _delete_listing_card_reactions_for_chat(chat_pk: int) -> None:
    ListingCardReaction.objects.filter(message__chat_id=chat_pk).delete()


def _leave_or_delete_housing_group_for_user(user, old_chat: Chat) -> None:
    """Leave housing group or delete it if user was the only member."""
    if old_chat.chat_type != Chat.CHAT_TYPE_HOUSING_GROUP:
        return
    if user not in old_chat.participants.all():
        return
    if old_chat.participants.count() <= 1:
        _delete_listing_card_reactions_for_chat(old_chat.pk)
        Message.objects.filter(chat=old_chat).update(reply_to=None)
        old_chat.delete()
    else:
        old_chat.participants.remove(user)


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

    def perform_destroy(self, instance):
        _delete_listing_card_reactions_for_chat(instance.pk)
        Message.objects.filter(chat=instance).update(reply_to=None)
        super().perform_destroy(instance)

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
        base_queryset = chat.messages.select_related(
            'sender__profile',
            'listing',
            'reply_to__sender__profile',
        )

        if is_housing_group:
            liked_by = request.query_params.get('housing_filter_liked_by')
            unanimous_raw = (request.query_params.get('housing_filter_unanimous') or '').lower()
            if liked_by and str(liked_by).strip():
                try:
                    uid = int(liked_by)
                except (TypeError, ValueError):
                    return Response({'detail': 'Invalid housing_filter_liked_by'}, status=status.HTTP_400_BAD_REQUEST)
                if uid not in participant_ids:
                    return Response({'detail': 'User is not a group participant'}, status=status.HTTP_400_BAD_REQUEST)
                liked_ids = ListingCardReaction.objects.filter(
                    message__chat=chat,
                    message__message_kind=Message.KIND_LISTING,
                    user_id=uid,
                    is_like=True,
                ).values_list('message_id', flat=True)
                base_queryset = base_queryset.filter(id__in=liked_ids)
            elif unanimous_raw in ('1', 'true', 'yes'):
                pset = set(participant_ids)
                n = len(pset)
                listing_ids = list(
                    base_queryset.filter(message_kind=Message.KIND_LISTING).values_list('id', flat=True)
                )
                keep_ids = []
                for mid in listing_ids:
                    likers = set(
                        ListingCardReaction.objects.filter(
                            message_id=mid,
                            is_like=True,
                        ).values_list('user_id', flat=True)
                    )
                    if likers == pset and len(likers) == n and n > 0:
                        keep_ids.append(mid)
                base_queryset = base_queryset.filter(id__in=keep_ids)

            base_queryset = base_queryset.prefetch_related(
                Prefetch(
                    'listing_reactions',
                    queryset=ListingCardReaction.objects.select_related('user__profile').order_by('-updated_at'),
                )
            )

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

    @action(detail=True, methods=['get'], url_path='listing-reactions-sync')
    def listing_reactions_sync(self, request, pk=None):
        """
        Возвращает актуальные listing_ratings для карточек объявлений по id сообщений.
        Нужен для опроса: голоса других участников не создают новых сообщений.
        """
        chat = self.get_object()
        if chat.chat_type != Chat.CHAT_TYPE_HOUSING_GROUP:
            return Response({'updates': []})

        raw = (request.query_params.get('message_ids') or '').strip()
        if not raw:
            return Response({'updates': []})

        try:
            ids = [int(x.strip()) for x in raw.split(',') if x.strip()]
        except ValueError:
            return Response({'detail': 'Invalid message_ids'}, status=status.HTTP_400_BAD_REQUEST)

        ids = [i for i in ids if i > 0][:120]
        if not ids:
            return Response({'updates': []})

        msgs = (
            chat.messages.filter(id__in=ids, message_kind=Message.KIND_LISTING)
            .prefetch_related(
                Prefetch(
                    'listing_reactions',
                    queryset=ListingCardReaction.objects.select_related('user__profile').order_by('-updated_at'),
                )
            )
        )
        serializer = MessageSerializer(msgs, many=True, context={'request': request})
        updates = [
            {'id': row['id'], 'listing_ratings': row['listing_ratings']}
            for row in serializer.data
        ]
        return Response({'updates': updates})

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

    @action(detail=False, methods=['get'], url_path='telegram-link-status')
    def telegram_link_status(self, request):
        bot_username = str(getattr(settings, "TELEGRAM_CHAT_BOT_USERNAME", "") or "").strip().lstrip("@")
        linked_telegram_user_id = find_telegram_link(request.user.id)
        return Response({
            "linked": linked_telegram_user_id is not None,
            "telegram_user_id": linked_telegram_user_id,
            "bot_username": bot_username,
        })

    @action(detail=False, methods=['post'], url_path='telegram-link-start')
    def telegram_link_start(self, request):
        if not can_sign_telegram_links():
            return Response(
                {"detail": "Telegram link secret is not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        bot_username = str(getattr(settings, "TELEGRAM_CHAT_BOT_USERNAME", "") or "").strip().lstrip("@")
        if not bot_username:
            return Response(
                {"detail": "Telegram bot username is not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        lang = str(getattr(request, "LANGUAGE_CODE", "ru") or "ru")[:2].lower()
        if lang not in ("ru", "en", "cz", "cs", "uk"):
            lang = "ru"
        token = sign_link_token(request.user.id, "cz" if lang == "cs" else lang)
        return Response({
            "linked": find_telegram_link(request.user.id) is not None,
            "deep_link_token": token,
            "link_url": f"https://t.me/{bot_username}?start={token}",
            "bot_username": bot_username,
        })

    @action(detail=False, methods=['post'], url_path='telegram-link-unlink')
    def telegram_link_unlink(self, request):
        removed_tg_ids = unlink_telegram(request.user.id)

        bot_token = str(getattr(settings, "TELEGRAM_BOT_TOKEN", "") or "").strip()
        notified = 0
        if bot_token and removed_tg_ids:
            api_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            text = (
                "Привязка Telegram была отменена на сайте FlatFly.\n"
                "Доступ к чатам через бота остановлен. История сессии очищена."
            )
            for tg_id in removed_tg_ids:
                try:
                    requests.post(
                        api_url,
                        json={
                            "chat_id": tg_id,
                            "text": text,
                            "reply_markup": {"remove_keyboard": True},
                        },
                        timeout=5,
                    )
                    notified += 1
                except Exception:
                    continue

        return Response(
            {
                "linked": False,
                "removed_links": len(removed_tg_ids),
                "notified": notified,
            }
        )

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
            confirm = request.data.get('confirm_leave_previous')
            confirm_ok = confirm is True or confirm == 'true' or confirm == '1' or confirm == 1
            if not confirm_ok:
                return Response(
                    {
                        'code': 'already_in_group',
                        'chatid': other_group.chatid,
                        'detail': 'Leave your current group before joining another.',
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            _leave_or_delete_housing_group_for_user(request.user, other_group)

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
    queryset = Message.objects.all().select_related(
        'sender__profile',
        'chat',
        'reply_to__sender__profile',
    )
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        chat_id = self.request.query_params.get('chatid')
        qs = Message.objects.filter(chat__participants=self.request.user).select_related(
            'sender__profile',
            'chat',
            'reply_to__sender__profile',
        )
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

        raw_reply = self.request.data.get('reply_to')
        reply_to = None
        if raw_reply is not None and raw_reply != '':
            try:
                rid = int(raw_reply)
            except (TypeError, ValueError):
                raise ValidationError({'reply_to': ['Invalid reply_to']})
            reply_to = Message.objects.filter(pk=rid, chat=chat).first()
            if not reply_to:
                raise ValidationError({'reply_to': ['Reply target not found in this chat']})

        serializer.save(
            sender=self.request.user,
            chat=chat,
            message_kind=Message.KIND_TEXT,
            reply_to=reply_to,
        )

    @action(detail=True, methods=['post'], url_path='listing-reaction')
    def listing_reaction(self, request, pk=None):
        message = self.get_object()
        if message.message_kind != Message.KIND_LISTING:
            return Response({'detail': 'Not a listing message'}, status=status.HTTP_400_BAD_REQUEST)
        if request.user not in message.chat.participants.all():
            return Response(status=status.HTTP_403_FORBIDDEN)
        if message.chat.chat_type != Chat.CHAT_TYPE_HOUSING_GROUP:
            return Response({'detail': 'Listing reactions are only for housing group chats'}, status=400)

        raw = request.data.get('is_like')
        if raw not in (True, False):
            return Response({'detail': 'is_like must be a boolean'}, status=status.HTTP_400_BAD_REQUEST)

        ListingCardReaction.objects.update_or_create(
            message=message,
            user=request.user,
            defaults={'is_like': raw},
        )
        message = (
            Message.objects.filter(pk=message.pk)
            .select_related('sender__profile', 'listing', 'chat', 'reply_to__sender__profile')
            .prefetch_related(
                Prefetch(
                    'listing_reactions',
                    queryset=ListingCardReaction.objects.select_related('user__profile').order_by('-updated_at'),
                )
            )
            .first()
        )
        return Response(MessageSerializer(message, context={'request': request}).data)
