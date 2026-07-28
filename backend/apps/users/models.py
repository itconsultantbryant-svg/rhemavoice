import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=32, blank=True, default="")
    display_name = models.CharField(max_length=120, blank=True, default="")
    avatar_url = models.URLField(blank=True, default="")
    theme_preference = models.CharField(
        max_length=16,
        choices=[("light", "Light"), ("dark", "Dark"), ("system", "System")],
        default="system",
    )

    class Meta:
        ordering = ["email"]

    def __str__(self):
        return self.email or self.username

    @property
    def role_codes(self):
        return list(self.user_roles.select_related("role").values_list("role__code", flat=True))


class OTPChallenge(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otp_challenges")
    code = models.CharField(max_length=8)
    purpose = models.CharField(max_length=32, default="login")
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]
