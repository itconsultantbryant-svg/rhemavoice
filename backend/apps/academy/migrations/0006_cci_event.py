from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [("academy", "0005_cci_resource"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(name="CCIEvent", fields=[
            ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
            ("title", models.CharField(max_length=200)), ("description", models.TextField(blank=True, default="")),
            ("audience", models.CharField(max_length=20, default="all", choices=[("all", "All participants"), ("staff", "Staff"), ("students", "Students")])),
            ("starts_at", models.DateTimeField()), ("ends_at", models.DateTimeField(null=True, blank=True)), ("location", models.CharField(max_length=200, blank=True, default="")),
            ("status", models.CharField(max_length=20, default="scheduled", choices=[("scheduled", "Scheduled"), ("cancelled", "Cancelled"), ("completed", "Completed")])),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_cci_events", to=settings.AUTH_USER_MODEL)),
            ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_events", to="academy.institution")),
        ], options={"ordering": ["starts_at"]}),
        migrations.AddIndex(model_name="ccievent", index=models.Index(fields=["institution", "status", "starts_at"], name="academy_cc_institu_0fba9b_idx")),
        migrations.AddIndex(model_name="ccievent", index=models.Index(fields=["audience", "starts_at"], name="academy_cc_audienc_26d7dc_idx")),
    ]
