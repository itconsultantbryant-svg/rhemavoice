import uuid

from django.db import models


class MetricSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=80)
    label = models.CharField(max_length=120, blank=True, default="")
    value = models.FloatField(default=0)
    unit = models.CharField(max_length=20, blank=True, default="")
    module = models.CharField(max_length=40, blank=True, default="")
    captured_for = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.key}={self.value}"
