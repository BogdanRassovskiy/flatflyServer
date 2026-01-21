from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Article


@require_http_methods(["GET"])
def articles_list(request):
    """Получить все статьи"""
    articles = Article.objects.all()
    data = []
    for article in articles:
        data.append({
            "id": article.id,
            "title": article.title,
            "subtitle": article.subtitle,
            "date": article.date,
            "image": article.image.url if article.image else None,
            "content": {
                "en": article.content_en,
                "ru": article.content_ru,
                "cz": article.content_cz,
            }
        })
    return JsonResponse({"articles": data})


@require_http_methods(["GET"])
def article_detail(request, article_id):
    """Получить одну статью по ID"""
    try:
        article = Article.objects.get(id=article_id)
        data = {
            "id": article.id,
            "title": article.title,
            "subtitle": article.subtitle,
            "date": article.date,
            "image": article.image.url if article.image else None,
            "content": {
                "en": article.content_en,
                "ru": article.content_ru,
                "cz": article.content_cz,
            }
        }
        return JsonResponse(data)
    except Article.DoesNotExist:
        return JsonResponse({"error": "Article not found"}, status=404)
