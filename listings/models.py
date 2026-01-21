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
        ("APARTMENT", "Apartment"),
        ("ROOM", "Room"),
        ("NEIGHBOUR", "Neighbour"),
    ]

    RENTAL_PERIOD_CHOICES = [
        ("SHORT", "Short term"),
        ("LONG", "Long term"),
        ("BOTH", "Both"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings"
    )

    # Основные
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField()

    region = models.CharField(max_length=32, choices=REGION_CHOICES)
    address = models.CharField(max_length=255, blank=True)

    price = models.DecimalField(max_digits=10, decimal_places=2)
    rooms = models.IntegerField(null=True, blank=True)
    beds = models.IntegerField(null=True, blank=True)
    size = models.IntegerField(null=True, blank=True)  # м²

    # Логика проживания
    has_roommates = models.BooleanField(default=False)
    rental_period = models.CharField(
        max_length=10,
        choices=RENTAL_PERIOD_CHOICES,
        default="LONG"
    )

    # Условия
    internet = models.BooleanField(default=False)
    utilities_included = models.BooleanField(default=False)
    pets_allowed = models.BooleanField(default=False)
    smoking_allowed = models.BooleanField(default=False)

    # Заселение
    move_in_date = models.DateField(null=True, blank=True)

    # Удобства (пока просто строка, потом можно вынести в M2M)
    amenities = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.city})"

class ListingImage(models.Model):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="images"
    )
    image = models.ImageField(upload_to="listings/")
    uploaded_at = models.DateTimeField(auto_now_add=True)