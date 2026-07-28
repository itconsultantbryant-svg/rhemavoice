import uuid

from django.db import models


class StoreProduct(models.Model):
    CATEGORY = [
        ("books", "Books"),
        ("apparel", "Apparel"),
        ("accessories", "Accessories"),
        ("digital", "Digital"),
        ("gift_card", "Gift Card"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    price_cents = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=64, blank=True, default="")
    category = models.CharField(max_length=40, choices=CATEGORY, default="apparel")
    stock = models.PositiveIntegerField(default=100)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_featured", "title"]

    def __str__(self):
        return self.title
