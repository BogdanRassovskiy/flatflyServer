from django.conf import settings
from django.db import models
import unicodedata


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii").lower().strip()


class University(models.Model):
    name = models.CharField(max_length=255)
    normalized_name = models.CharField(max_length=255, unique=True, db_index=True)
    short_name = models.CharField(max_length=64, blank=True, default="")
    city = models.CharField(max_length=128, blank=True, default="")
    address = models.CharField(max_length=255, blank=True, default="")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    osm_ref = models.CharField(max_length=64, blank=True, default="", unique=True)
    source = models.CharField(max_length=32, default="OSM")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def save(self, *args, **kwargs):
        self.normalized_name = normalize_text(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class UniversityFaculty(models.Model):
    university = models.ForeignKey(
        University,
        on_delete=models.CASCADE,
        related_name="faculties",
    )
    name = models.CharField(max_length=255)
    normalized_name = models.CharField(max_length=255, db_index=True)
    city = models.CharField(max_length=128, blank=True, default="")
    address = models.CharField(max_length=255, blank=True, default="")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    osm_ref = models.CharField(max_length=64, blank=True, default="", unique=True)
    source = models.CharField(max_length=32, default="OSM")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["university", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["university", "normalized_name", "address"],
                name="uniq_university_faculty_name_address",
            )
        ]

    def save(self, *args, **kwargs):
        self.normalized_name = normalize_text(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.university.name}: {self.name}"


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
    phone = models.CharField(max_length=20, blank=True, null=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=SEX_CHOICES, blank=True)

    city = models.CharField(max_length=100, blank=True)
    university = models.ForeignKey(
        University,
        on_delete=models.SET_NULL,
        related_name="profiles",
        null=True,
        blank=True,
    )
    faculty = models.ForeignKey(
        UniversityFaculty,
        on_delete=models.SET_NULL,
        related_name="profiles",
        null=True,
        blank=True,
    )
    languages = models.CharField(max_length=200, blank=True)  
    profession = models.CharField(max_length=100, blank=True)
    location_region = models.CharField(max_length=32, blank=True, default="")
    location_city = models.CharField(max_length=128, blank=True, default="")
    location_address = models.CharField(max_length=255, blank=True, default="")
    location_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
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
    favorite_profiles = models.ManyToManyField(
        'self',
        related_name='favorited_neighbors',
        blank=True,
        symmetrical=False,
        help_text="Избранные соседи"
    )

    # === STATUS ===
    verified = models.BooleanField(default=False)
    looking_for_housing = models.BooleanField(default=True)
    with_children = models.BooleanField(default=False)
    with_disability = models.BooleanField(default=False)
    pensioner = models.BooleanField(default=False)

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


class ProfileCompletionWeight(models.Model):
    attribute_key = models.CharField(max_length=64, unique=True)
    label = models.CharField(max_length=128)
    weight = models.DecimalField(max_digits=6, decimal_places=2, default=1)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["attribute_key", "id"]

    def __str__(self):
        return f"{self.attribute_key} ({self.weight})"


class ProfileRankingConfig(models.Model):
    code = models.CharField(max_length=64, unique=True)
    label = models.CharField(max_length=128)
    weight = models.DecimalField(max_digits=6, decimal_places=2, default=1)
    hard_filter = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code", "id"]

    def __str__(self):
        mode = "hard" if self.hard_filter else "soft"
        return f"{self.code} ({mode}, {self.weight})"


class ProfileReview(models.Model):
    reviewer = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="given_reviews",
    )
    target = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name="received_reviews",
    )
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["reviewer", "target"],
                name="uniq_profile_review_reviewer_target",
            ),
        ]

    def __str__(self):
        return f"{self.reviewer_id} -> {self.target_id} ({self.rating})"