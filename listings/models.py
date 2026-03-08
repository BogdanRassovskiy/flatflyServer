from django.conf import settings
from django.db import models


class Listing(models.Model):
    REGION_CHOICES = [
        ("PRAGUE", "Praha"),
        ("STREDOCESKY", "Středočeský kraj"),
        ("JIHOCESKY", "Jihočeský kraj"),
        ("PLZENSKY", "Plzeňský kraj"),
        ("KARLOVARSKY", "Karlovarský kraj"),
        ("USTECKY", "Ústecký kraj"),
        ("LIBERECKY", "Liberecký kraj"),
        ("KRALOVEHRADECKY", "Královéhradecký kraj"),
        ("PARDUBICKY", "Pardubický kraj"),
        ("VYSOCINA", "Vysočina"),
        ("JIHOMORAVSKY", "Jihomoravský kraj"),
        ("OLOMOUCKY", "Olomoucký kraj"),
        ("ZLINSKY", "Zlínský kraj"),
        ("MORAVSKOSLEZSKY", "Moravskoslezský kraj"),
    ]
    
    TYPE_CHOICES = [
        ("BYT", "Byt"),
        ("DUM", "Dům"),
        ("APARTMENT", "Apartment"),
        ("ROOM", "Room"),
        ("NEIGHBOUR", "Kolej"),
    ]

    RENTAL_PERIOD_CHOICES = [
        ("SHORT", "Short term"),
        ("LONG", "Long term"),
        ("BOTH", "Both"),
    ]
    
    # condition_state choices
    CONDITION_CHOICES = [
        ("VELMI_DOBRY", "Velmi dobrý"),
        ("DOBRY", "Dobrý"),
        ("SPATNY", "Špatný"),
        ("NOVOSTAVBA", "Novostavba"),
        ("VE_VYSTAVBE", "Ve výstavbě"),
        ("PRED_REKONSTRUKCI", "Před rekonstrukcí"),
        ("V_REKONSTRUKCI", "V rekonstrukci"),
        ("PO_REKONSTRUKCI", "Po rekonstrukci"),
    ]
    
    # energy_class choices
    ENERGY_CLASS_CHOICES = [
        ("A", "A"),
        ("B", "B"),
        ("C", "C"),
        ("D", "D"),
        ("E", "E"),
        ("F", "F"),
        ("G", "G"),
    ]
    
    CURRENCY_CHOICES = [
        ("CZK", "CZK"),
        ("EUR", "EUR"),
        ("USD", "USD"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="listings"
    )

    type = models.CharField(max_length=20, choices=TYPE_CHOICES, db_column="property_type", default="APARTMENT")
    
    # Основные
    title = models.CharField(max_length=255)
    description = models.TextField()

    # ========== Локация ==========
    country = models.CharField(max_length=100, default="CZ")
    region = models.CharField(max_length=32, choices=REGION_CHOICES)
    city = models.CharField(max_length=255, blank=True)  # municipality
    address = models.CharField(max_length=255, blank=True)  # address_text
    geo_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    geo_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    # ========== Площади и цена ==========
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default="CZK")
    size = models.IntegerField(null=True, blank=True, db_column="usable_area")
    
    rooms = models.IntegerField(null=True, blank=True)
    beds = models.IntegerField(null=True, blank=True)

    # ========== Состояние ==========
    condition_state = models.CharField(
        max_length=32, 
        choices=CONDITION_CHOICES,
        null=True,
        blank=True
    )

    # ========== Энергетика ==========
    energy_class = models.CharField(
        max_length=1,
        choices=ENERGY_CLASS_CHOICES,
        null=True,
        blank=True
    )

    # ========== Инфраструктура в okolí (POI flags) ==========
    has_bus_stop = models.BooleanField(default=False)
    has_train_station = models.BooleanField(default=False)
    has_metro = models.BooleanField(default=False)
    has_post_office = models.BooleanField(default=False)
    has_atm = models.BooleanField(default=False)
    has_general_practitioner = models.BooleanField(default=False)
    has_vet = models.BooleanField(default=False)
    has_primary_school = models.BooleanField(default=False)
    has_kindergarten = models.BooleanField(default=False)
    has_supermarket = models.BooleanField(default=False)
    has_small_shop = models.BooleanField(default=False)
    has_restaurant = models.BooleanField(default=False)
    has_playground = models.BooleanField(default=False)

    # ========== Поиск и контент ==========
    has_video = models.BooleanField(default=False)
    has_3d_tour = models.BooleanField(default=False)
    has_floorplan = models.BooleanField(default=False)

    # ========== Логика проживания (сохраняем старые) ==========
    has_roommates = models.BooleanField(default=False)
    rental_period = models.CharField(
        max_length=10,
        choices=RENTAL_PERIOD_CHOICES,
        default="LONG"
    )

    # ========== Условия (сохраняем старые) ==========
    internet = models.BooleanField(default=False)
    utilities_included = models.BooleanField(default=False)
    pets_allowed = models.BooleanField(default=False)
    smoking_allowed = models.BooleanField(default=False)

    # Заселение
    move_in_date = models.DateField(null=True, blank=True)

    # Удобства
    amenities = models.JSONField(default=list, blank=True)

    # Верификация
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    max_residents = models.PositiveSmallIntegerField(default=1)
    utilities_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.city if self.city else self.region})"

class ListingImage(models.Model):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="images"
    )
    image = models.ImageField(upload_to="listings/")
    uploaded_at = models.DateTimeField(auto_now_add=True)


class ListingResident(models.Model):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="residents",
    )
    profile = models.OneToOneField(
        'users.Profile',
        on_delete=models.CASCADE,
        related_name="home_residency",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "profile"],
                name="uniq_listing_profile_resident",
            )
        ]


class ListingInvite(models.Model):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="invites",
    )
    token = models.CharField(max_length=32, unique=True)
    created_by = models.ForeignKey(
        'users.Profile',
        on_delete=models.CASCADE,
        related_name="created_listing_invites",
    )
    accepted_by = models.ForeignKey(
        'users.Profile',
        on_delete=models.SET_NULL,
        related_name="accepted_listing_invites",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)