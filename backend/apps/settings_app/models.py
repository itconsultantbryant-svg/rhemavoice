import uuid

from django.conf import settings
from django.db import models


class UserPreference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="preferences", null=True, blank=True
    )
    key = models.CharField(max_length=80, blank=True, default="defaults")
    value = models.JSONField(default=dict, blank=True)
    notify_email = models.BooleanField(default=True)
    notify_push = models.BooleanField(default=True)
    notify_sms = models.BooleanField(default=False)
    language = models.CharField(max_length=16, default="en")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user_id}:{self.key}"
