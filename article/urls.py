from django.urls import path
from . import views

urlpatterns = [
    path("api/articles/", views.articles_list, name="articles_list"),
    path("api/articles/<int:article_id>/", views.article_detail, name="article_detail"),
    path("api/faqs/", views.faqs_list, name="faqs_list"),
    path("api/faqs", views.faqs_list, name="faqs_list_noslash"),
    path("api/newsletter/", views.newsletter_subscribe, name="newsletter_subscribe"),
    path("api/newsletter", views.newsletter_subscribe, name="newsletter_subscribe_noslash"),
]
