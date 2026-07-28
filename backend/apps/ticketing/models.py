import uuid

from django.conf import settings
from django.db import models


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    organizer = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    venue = models.CharField(max_length=200, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    country = models.CharField(max_length=100, blank=True, default="")
    starts_at = models.DateTimeField(null=True, blank=True)
    category = models.CharField(max_length=80, blank=True, default="")
    banner_url = models.URLField(blank=True, default="")
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["starts_at", "title"]

    def __str__(self):
        return self.title


class TicketTier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="tiers")
    name = models.CharField(max_length=80)
    price_cents = models.PositiveIntegerField(default=0)
    quantity_available = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.event.title} — {self.name}"


class TicketOrder(models.Model):
    STATUS = [("pending", "Pending"), ("paid", "Paid"), ("cancelled", "Cancelled")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="orders")
    tier = models.ForeignKey(TicketTier, on_delete=models.CASCADE, related_name="orders")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ticket_orders")
    quantity = models.PositiveIntegerField(default=1)
    total_cents = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
