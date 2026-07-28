import uuid

from django.conf import settings
from django.db import models


class VoiceRoom(models.Model):
    VISIBILITY = [
        ("public", "Public"),
        ("private", "Private"),
        ("password", "Password Protected"),
        ("invite", "Invite Only"),
        ("scheduled", "Scheduled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    visibility = models.CharField(max_length=40, choices=VISIBILITY, default="public")
    topic = models.CharField(max_length=120, blank=True, default="")
    is_live = models.BooleanField(default=False)
    participant_count = models.PositiveIntegerField(default=0)
    max_speakers = models.PositiveIntegerField(default=8)
    host_name = models.CharField(max_length=120, blank=True, default="")
    password_hint = models.CharField(max_length=40, blank=True, default="")
    scheduled_at = models.DateTimeField(null=True, blank=True)
    recording_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_live", "-participant_count", "title"]

    def __str__(self):
        return self.title


class RoomParticipant(models.Model):
    ROLE_CHOICES = [("listener", "Listener"), ("speaker", "Speaker"), ("moderator", "Moderator"), ("host", "Host")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(VoiceRoom, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="room_participations")
    display_name = models.CharField(max_length=120, blank=True, default="")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="listener")
    is_muted = models.BooleanField(default=True)
    hand_raised = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("room", "user")


class RoomPoll(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(VoiceRoom, on_delete=models.CASCADE, related_name="polls")
    question = models.CharField(max_length=240)
    options = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class RoomChatMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(VoiceRoom, on_delete=models.CASCADE, related_name="messages")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="room_messages"
    )
    display_name = models.CharField(max_length=120, blank=True, default="")
    message = models.TextField()
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
