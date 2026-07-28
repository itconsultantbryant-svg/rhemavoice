import uuid

from django.conf import settings
from django.db import models


class Stream(models.Model):
    STATUS_CHOICES = [
        ("live", "Live"),
        ("scheduled", "Scheduled"),
        ("recorded", "Recorded"),
        ("ended", "Ended"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default="scheduled")
    church_name = models.CharField(max_length=200, blank=True, default="")
    series = models.CharField(max_length=200, blank=True, default="")
    scheduled_at = models.DateTimeField(null=True, blank=True)
    viewers = models.PositiveIntegerField(default=0)
    duration_min = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    playback_url = models.URLField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_featured", "-created_at"]

    def __str__(self):
        return self.title


class StreamChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stream = models.ForeignKey(Stream, on_delete=models.CASCADE, related_name="chat_messages")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="stream_messages"
    )
    display_name = models.CharField(max_length=120, blank=True, default="")
    message = models.TextField()
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class PrayerRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stream = models.ForeignKey(Stream, null=True, blank=True, on_delete=models.SET_NULL, related_name="prayers")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="prayer_requests")
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True, default="")
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
