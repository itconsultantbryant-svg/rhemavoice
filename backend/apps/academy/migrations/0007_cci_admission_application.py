from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [("academy", "0006_cci_event"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(name="CCIAdmissionApplication", fields=[
            ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
            ("status", models.CharField(max_length=20, default="draft", choices=[("draft", "Draft"), ("submitted", "Submitted"), ("under_review", "Under review"), ("accepted", "Accepted"), ("rejected", "Rejected"), ("withdrawn", "Withdrawn")])),
            ("fields", models.JSONField(default=dict, blank=True)), ("reviewer_note", models.TextField(blank=True, default="")),
            ("reviewed_at", models.DateTimeField(null=True, blank=True)), ("submitted_at", models.DateTimeField(null=True, blank=True)), ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("applicant", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="cci_admissions", to=settings.AUTH_USER_MODEL)),
            ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_admissions", to="academy.institution")),
            ("reviewed_by", models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviewed_cci_admissions", to=settings.AUTH_USER_MODEL)),
        ]),
        migrations.AddConstraint(model_name="cciadmissionapplication", constraint=models.UniqueConstraint(fields=("institution", "applicant"), name="unique_cci_admission_applicant")),
        migrations.AddIndex(model_name="cciadmissionapplication", index=models.Index(fields=["institution", "status", "created_at"], name="academy_cc_institu_359595_idx")),
        migrations.AddIndex(model_name="cciadmissionapplication", index=models.Index(fields=["applicant", "status"], name="academy_cc_applica_2e70fb_idx")),
    ]
