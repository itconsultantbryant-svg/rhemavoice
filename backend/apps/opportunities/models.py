import uuid

from django.conf import settings
from django.db import models


class Opportunity(models.Model):
    TYPES = [
        ("job", "Job"),
        ("scholarship", "Scholarship"),
        ("grant", "Grant"),
        ("loan", "Loan"),
    ]
    STATUS = [("open", "Open"), ("closed", "Closed"), ("draft", "Draft")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=20, choices=TYPES)
    title = models.CharField(max_length=200)
    organization = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    location = models.CharField(max_length=120, blank=True, default="")
    country = models.CharField(max_length=80, blank=True, default="")
    category = models.CharField(max_length=80, blank=True, default="")
    amount_label = models.CharField(max_length=80, blank=True, default="")
    deadline = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="open")
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="opportunities"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "opportunities"

    def __str__(self):
        return f"{self.get_type_display()}: {self.title}"


class SavedOpportunity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_opportunities")
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="saves")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "opportunity")


class OpportunityApplication(models.Model):
    STATUS = [("submitted", "Submitted"), ("reviewing", "Reviewing"), ("shortlisted", "Shortlisted"), ("rejected", "Rejected")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name="applications")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="opportunity_applications")
    cover_note = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS, default="submitted")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("opportunity", "user")
