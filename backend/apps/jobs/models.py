import uuid

from django.conf import settings
from django.db import models


class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="companies"
    )
    name = models.CharField(max_length=200)
    industry = models.CharField(max_length=120, blank=True, default="")
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "companies"

    def __str__(self):
        return self.name


class JobPosting(models.Model):
    EMPLOYMENT = [
        ("full_time", "Full Time"),
        ("part_time", "Part Time"),
        ("contract", "Contract"),
        ("volunteer", "Volunteer"),
        ("internship", "Internship"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, null=True, blank=True, on_delete=models.SET_NULL, related_name="jobs")
    title = models.CharField(max_length=200)
    company_name = models.CharField(max_length=200, blank=True, default="")
    location = models.CharField(max_length=120, blank=True, default="")
    employment_type = models.CharField(max_length=40, choices=EMPLOYMENT, default="full_time")
    is_remote = models.BooleanField(default=False)
    description = models.TextField(blank=True, default="")
    salary_range = models.CharField(max_length=120, blank=True, default="")
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class JobApplication(models.Model):
    STATUS = [
        ("submitted", "Submitted"),
        ("reviewing", "Reviewing"),
        ("interview", "Interview"),
        ("offered", "Offered"),
        ("rejected", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name="applications")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="job_applications")
    cover_note = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS, default="submitted")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("job", "user")
        ordering = ["-created_at"]


class SavedJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name="saves")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_jobs")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("job", "user")


class Resume(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resume")
    headline = models.CharField(max_length=200, blank=True, default="")
    summary = models.TextField(blank=True, default="")
    skills = models.JSONField(default=list, blank=True)
    experience = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
