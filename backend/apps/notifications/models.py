import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    CHANNEL = [("in_app", "In App"), ("email", "Email"), ("push", "Push"), ("sms", "SMS")]
    CATEGORY = [
        ("system", "System"),
        ("academy", "Academy"),
        ("streaming", "Streaming"),
        ("rooms", "Rooms"),
        ("jobs", "Jobs"),
        ("store", "Store"),
        ("wallet", "Wallet"),
        ("chat", "Chat"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name="notifications"
    )
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True, default="")
    channel = models.CharField(max_length=40, choices=CHANNEL, default="in_app")
    category = models.CharField(max_length=40, choices=CATEGORY, default="system")
    action_url = models.CharField(max_length=300, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
