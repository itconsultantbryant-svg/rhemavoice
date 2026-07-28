import uuid

from django.conf import settings
from django.db import models


class TransportProvider(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    country = models.CharField(max_length=100, default="Liberia")
    phone = models.CharField(max_length=40, blank=True, default="")
    services = models.CharField(max_length=200, blank=True, default="")
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class TransportBooking(models.Model):
    STATUS = [("requested", "Requested"), ("confirmed", "Confirmed"), ("completed", "Completed"), ("cancelled", "Cancelled")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(TransportProvider, on_delete=models.CASCADE, related_name="bookings")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="transport_bookings")
    pickup_location = models.CharField(max_length=200)
    destination = models.CharField(max_length=200)
    service_type = models.CharField(max_length=80, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS, default="requested")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
