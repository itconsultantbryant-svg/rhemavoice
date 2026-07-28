import uuid

from django.conf import settings
from django.db import models


MODULE_CHOICES = [
    ("streaming", "Church Streaming"),
    ("academy", "Rhema Academy"),
    ("learn", "Rhema Learn"),
    ("radio", "Live Radio"),
    ("business", "Business Hub"),
    ("rooms", "Rhema Rooms"),
    ("opportunities", "Opportunities"),
    ("transport", "Rhema-Transervices"),
    ("ticketing", "Rhema-E-Ticketing"),
    ("air", "RhemaAir"),
]


class ModuleDefinition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True, choices=MODULE_CHOICES)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=64, default="circle")
    requires_profile = models.BooleanField(default=False)
    route = models.CharField(max_length=120)
    enabled = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.code


class ModuleProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="module_profiles")
    module = models.CharField(max_length=64, choices=MODULE_CHOICES)
    data = models.JSONField(default=dict, blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "module")
        ordering = ["-updated_at"]
