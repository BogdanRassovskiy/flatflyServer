from django.db import models


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
