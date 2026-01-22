from django.conf import settings
from django.db import models


class Profile(models.Model):
    SEX_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
    ]

    YES_NO_CHOICES = [
        ("yes", "Yes"),
        ("no", "No"),
        ("sometimes", "Sometimes"),
        ("rarely", "Rarely"),
        ("allowed", "Allowed"),
        ("notAllowed", "Not Allowed"),
    ]
    AUTH_PROVIDERS = [
        ("email", "Email & Password"),
        ("google", "Google"),
        ("apple", "Apple"),
    ]

    auth_provider = models.CharField(
        max_length=20,
        choices=AUTH_PROVIDERS,
        default="email",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    # === BASIC INFO ===
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)

    name = models.CharField(max_length=150, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=SEX_CHOICES, blank=True)

    city = models.CharField(max_length=100, blank=True)
    languages = models.CharField(max_length=200, blank=True)  
    profession = models.CharField(max_length=100, blank=True)
    about = models.TextField(blank=True)

    # === SOCIAL HABITS ===
    smoking = models.CharField(max_length=20, blank=True)
    alcohol = models.CharField(max_length=20, blank=True)
    sleep_schedule = models.CharField(max_length=20, blank=True)
    noise_tolerance = models.TextField(blank=True)

    gamer = models.CharField(max_length=10, blank=True)
    work_from_home = models.CharField(max_length=10, blank=True)
    pets = models.TextField(blank=True)

    cleanliness = models.PositiveSmallIntegerField(default=5)
    introvert_extrovert = models.PositiveSmallIntegerField(default=5)

    guests_parties = models.CharField(max_length=20, blank=True)

    # === PREFERENCES ===
    preferred_gender = models.CharField(max_length=10, blank=True)
    preferred_age_range = models.CharField(max_length=50, blank=True)

    # === FAVORITES ===
    favorite_listings = models.ManyToManyField(
        'listings.Listing',
        related_name='favorited_by',
        blank=True,
        help_text="Избранные объявления"
    )

    # === STATUS ===
    verified = models.BooleanField(default=False)
    looking_for_housing = models.BooleanField(default=True)

    # === AUTH ===
    AUTH_PROVIDERS = [
        ("email", "Email & Password"),
        ("google", "Google"),
        ("apple", "Apple"),
    ]
    auth_provider = models.CharField(
        max_length=20,
        choices=AUTH_PROVIDERS,
        default="email",
    )
    # === META ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile of {self.user.username}"