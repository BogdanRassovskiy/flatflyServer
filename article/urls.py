from django.urls import path
from . import views

urlpatterns = [
    path("api/articles/", views.articles_list, name="articles_list"),
    path("api/articles/<int:article_id>/", views.article_detail, name="article_detail"),
]
