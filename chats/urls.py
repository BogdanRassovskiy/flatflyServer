from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatViewSet, MessageViewSet, telegram_bot_session

router = DefaultRouter()
router.register(r'chats', ChatViewSet, basename='chat')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('chats/telegram-bot/session/', telegram_bot_session, name='telegram_bot_session'),
    path('', include(router.urls)),
]
