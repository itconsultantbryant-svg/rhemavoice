import uuid

from django.conf import settings
from django.db import models


class FeatureToggle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=64, unique=True)
    label = models.CharField(max_length=120)
    enabled = models.BooleanField(default=True)
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return self.key


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=180)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class SystemSetting(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=64, unique=True)
    value = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.key


class ContentEntry(models.Model):
    """Platform content managed from the super-admin console."""

    STATUS = [("draft", "Draft"), ("published", "Published"), ("archived", "Archived")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.CharField(max_length=64, blank=True, default="platform")
    slug = models.SlugField(max_length=120, unique=True)
    title = models.CharField(max_length=200)
    summary = models.TextField(blank=True, default="")
    body = models.JSONField(default=dict, blank=True)
    media_url = models.URLField(blank=True, default="")
    status = models.CharField(max_length=16, choices=STATUS, default="draft")
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title
