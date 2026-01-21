from django.conf import settings
from django.db import models


class Listing(models.Model):
    TYPE_CHOICES = [
        ("APARTMENT", "Apartment"),
        ("ROOM", "Room"),
        ("SHAREROOM", "Shared room"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings"
    )

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField()

    layout = models.CharField(max_length=50, blank=True)
    beds = models.IntegerField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    address = models.CharField(max_length=255, blank=True, default="")
    size = models.CharField(max_length=255, blank=True, default="")
    rooms = models.CharField(max_length=255, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.owner})"


class ListingImage(models.Model):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="images"
    )

    image = models.ImageField(upload_to="listings/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for listing {self.listing_id}"