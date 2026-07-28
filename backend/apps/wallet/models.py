import uuid

from django.conf import settings
from django.db import models


class WalletAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallet")
    balance_cents = models.IntegerField(default=0)
    currency = models.CharField(max_length=8, default="USD")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} wallet"


class Transaction(models.Model):
    TYPE = [
        ("topup", "Top Up"),
        ("withdrawal", "Withdrawal"),
        ("purchase", "Purchase"),
        ("transfer_in", "Transfer In"),
        ("transfer_out", "Transfer Out"),
        ("giving", "Giving"),
        ("refund", "Refund"),
    ]
    STATUS = [("pending", "Pending"), ("completed", "Completed"), ("failed", "Failed")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(WalletAccount, on_delete=models.CASCADE, related_name="transactions")
    tx_type = models.CharField(max_length=20, choices=TYPE)
    amount_cents = models.IntegerField(default=0)
    balance_after_cents = models.IntegerField(default=0)
    description = models.CharField(max_length=200, blank=True, default="")
    reference = models.CharField(max_length=32, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS, default="completed")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
