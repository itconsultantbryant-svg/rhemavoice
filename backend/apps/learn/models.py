import uuid

from django.conf import settings
from django.db import models


class LearningArea(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Lesson(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    area = models.ForeignKey(LearningArea, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    teacher_name = models.CharField(max_length=120, blank=True, default="")
    is_voice = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title


class LearningSession(models.Model):
    STATUS = [("scheduled", "Scheduled"), ("live", "Live"), ("completed", "Completed")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="sessions", null=True, blank=True)
    title = models.CharField(max_length=200)
    host = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    host_name = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS, default="scheduled")
    starts_at = models.DateTimeField(null=True, blank=True)
    participant_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-starts_at", "title"]

    def __str__(self):
        return self.title
