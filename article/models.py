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
