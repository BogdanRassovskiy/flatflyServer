from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Article, FAQ


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


@require_http_methods(["GET"])
def faqs_list(request):
    """Получить FAQ по языку (language), с fallback на English"""
    language = request.GET.get("language", "en")
    allowed_languages = {"en", "ru", "cz"}
    if language not in allowed_languages:
        language = "en"

    faqs = FAQ.objects.filter(language=language).order_by("faq_id")
    if not faqs.exists() and language != "en":
        faqs = FAQ.objects.filter(language="en").order_by("faq_id")

    data = [
        {
            "id": faq.id,
            "faq_id": faq.faq_id,
            "language": faq.language,
            "question": faq.question,
            "answer": faq.answer,
            "keys": faq.keys,
        }
        for faq in faqs
    ]

    return JsonResponse({"faqs": data})
