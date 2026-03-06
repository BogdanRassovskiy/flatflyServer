from django.db import models
from django.utils import timezone
from datetime import timedelta


def default_launch_date():
    return timezone.now() + timedelta(days=150)


class Article(models.Model):
    LANGUAGE_CHOICES = [
        ("en", "English"),
        ("ru", "Russian"),
        ("cz", "Czech"),
    ]

    title = models.CharField(max_length=255)
    subtitle = models.TextField()
    date = models.CharField(max_length=50)
    
    # Контент на разных языках (HTML)
    content_en = models.TextField(blank=True, help_text="Content in English (HTML allowed)")
    content_ru = models.TextField(blank=True, help_text="Content in Russian (HTML allowed)")
    content_cz = models.TextField(blank=True, help_text="Content in Czech (HTML allowed)")
    
    # Изображение
    image = models.ImageField(upload_to="articles/", blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Article"
        verbose_name_plural = "Articles"
    
    def __str__(self):
        return self.title


class FAQ(models.Model):
    LANGUAGE_CHOICES = [
        ("en", "English"),
        ("ru", "Russian"),
        ("cz", "Czech"),
    ]

    faq_id = models.PositiveIntegerField(db_index=True)
    language = models.CharField(max_length=2, choices=LANGUAGE_CHOICES)
    question = models.CharField(max_length=500)
    answer = models.TextField()
    keys = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["faq_id", "language"]
        constraints = [
            models.UniqueConstraint(fields=["faq_id", "language"], name="unique_faq_id_language"),
        ]
        verbose_name = "FAQ"
        verbose_name_plural = "FAQs"

    def __str__(self):
        return f"FAQ {self.faq_id} ({self.language})"


class LaunchSettings(models.Model):
    launch_date = models.DateTimeField(default=default_launch_date)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Launch settings"
        verbose_name_plural = "Launch settings"

    def __str__(self):
        return f"Launch: {self.launch_date.isoformat()}"


class NewsletterSubscription(models.Model):
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Newsletter subscription"
        verbose_name_plural = "Newsletter subscriptions"

    def __str__(self):
        return self.email
