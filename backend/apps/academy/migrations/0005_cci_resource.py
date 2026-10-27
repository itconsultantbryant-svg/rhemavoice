from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("academy", "0004_cci_foundation"),
    ]

    operations = [
        migrations.CreateModel(
            name="CCIResource",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("category", models.CharField(max_length=80, blank=True, default="general")),
                ("access_level", models.CharField(max_length=20, default="participants", choices=[("staff", "CCI staff"), ("participants", "CCI participants")])),
                ("status", models.CharField(max_length=20, default="draft", choices=[("draft", "Draft"), ("pending_review", "Pending review"), ("approved", "Approved"), ("rejected", "Rejected"), ("archived", "Archived")])),
                ("storage_key", models.CharField(max_length=500, blank=True, default="")),
                ("review_note", models.TextField(blank=True, default="")),
                ("reviewed_at", models.DateTimeField(null=True, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_cci_resources", to=settings.AUTH_USER_MODEL)),
                ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_resources", to="academy.institution")),
                ("reviewed_by", models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviewed_cci_resources", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.AddIndex(model_name="cciresource", index=models.Index(fields=["institution", "status", "access_level"], name="academy_cc_institu_1220a5_idx")),
        migrations.AddIndex(model_name="cciresource", index=models.Index(fields=["created_by", "status"], name="academy_cc_created_979fe7_idx")),
    ]
