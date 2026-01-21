from django.contrib import admin
from .models import Article


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "date", "created_at", "updated_at")
    list_filter = ("created_at", "updated_at")
    search_fields = ("title", "subtitle")
    readonly_fields = ("created_at", "updated_at")
    
    fieldsets = (
        ("Основная информация", {
            "fields": ("title", "subtitle", "date", "image")
        }),
        ("Контент", {
            "fields": ("content_en", "content_ru", "content_cz"),
            "classes": ("collapse",)
        }),
        ("Метаинформация", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
