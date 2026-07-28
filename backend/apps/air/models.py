import uuid

from django.conf import settings
from django.db import models


class TravelAgency(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")
    phone = models.CharField(max_length=40, blank=True, default="")
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    is_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "travel agencies"

    def __str__(self):
        return self.name


class FlightListing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agency = models.ForeignKey(TravelAgency, on_delete=models.CASCADE, related_name="flights")
    airline = models.CharField(max_length=120)
    flight_number = models.CharField(max_length=40, blank=True, default="")
    departure_city = models.CharField(max_length=100)
    arrival_city = models.CharField(max_length=100)
    departure_at = models.DateTimeField(null=True, blank=True)
    arrival_at = models.DateTimeField(null=True, blank=True)
    cabin_class = models.CharField(max_length=40, default="Economy")
    stops = models.PositiveIntegerField(default=0)
    price_cents = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=8, default="USD")

    class Meta:
        ordering = ["departure_at"]

    def __str__(self):
        return f"{self.departure_city} → {self.arrival_city}"


class FlightBooking(models.Model):
    STATUS = [("requested", "Requested"), ("confirmed", "Confirmed"), ("ticketed", "Ticketed"), ("cancelled", "Cancelled")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flight = models.ForeignKey(FlightListing, on_delete=models.CASCADE, related_name="bookings")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="flight_bookings")
    passengers = models.PositiveIntegerField(default=1)
    passenger_name = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS, default="requested")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
