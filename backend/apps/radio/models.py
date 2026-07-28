import uuid

from django.conf import settings
from django.db import models


class RadioStation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    genre = models.CharField(max_length=80, blank=True, default="")
    description = models.TextField(blank=True, default="")
    stream_url = models.URLField(blank=True, default="")
    presenters = models.CharField(max_length=200, blank=True, default="")
    is_live = models.BooleanField(default=True)
    listeners = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Podcast(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    station = models.ForeignKey(RadioStation, null=True, blank=True, on_delete=models.SET_NULL, related_name="podcasts")
    title = models.CharField(max_length=200)
    host = models.CharField(max_length=120, blank=True, default="")
    duration_min = models.PositiveIntegerField(default=30)
    description = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class RadioFavorite(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="radio_favorites")
    station = models.ForeignKey(RadioStation, on_delete=models.CASCADE, related_name="favorites")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "station")
