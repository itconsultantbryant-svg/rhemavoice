import uuid

from django.conf import settings
from django.db import models


class PaymentProvider(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    supports_currency = models.CharField(max_length=120, blank=True, default="USD")

    def __str__(self):
        return self.name


class Payment(models.Model):
    STATUS = [
        ("initiated", "Initiated"),
        ("succeeded", "Succeeded"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="payments"
    )
    amount_cents = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=8, default="USD")
    provider = models.CharField(max_length=40, blank=True, default="")
    purpose = models.CharField(max_length=120, blank=True, default="")
    reference = models.CharField(max_length=32, blank=True, default="")
    provider_reference = models.CharField(max_length=64, blank=True, default="")
    checkout_url = models.URLField(max_length=500, blank=True, default="")
    client_secret = models.CharField(max_length=120, blank=True, default="")
    sandbox = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS, default="initiated")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference or self.id} ({self.status})"
