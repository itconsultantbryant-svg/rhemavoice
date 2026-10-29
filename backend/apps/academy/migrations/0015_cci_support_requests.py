import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL), ("academy", "0014_course_content_and_attachments")]
    operations = [
        migrations.CreateModel(name="CCISupportRequest", fields=[
            ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
            ("subject", models.CharField(max_length=200)), ("category", models.CharField(default="general", max_length=80)), ("description", models.TextField()),
            ("status", models.CharField(choices=[("open", "Open"), ("in_progress", "In progress"), ("awaiting_response", "Awaiting response"), ("resolved", "Resolved"), ("closed", "Closed")], default="open", max_length=24)),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("course", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="support_requests", to="academy.course")),
            ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="support_requests", to="academy.institution")),
            ("requester", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_support_requests", to=settings.AUTH_USER_MODEL)),
        ]),
        migrations.CreateModel(name="CCISupportReply", fields=[
            ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)), ("body", models.TextField()), ("created_at", models.DateTimeField(auto_now_add=True)),
            ("author", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="cci_support_replies", to=settings.AUTH_USER_MODEL)),
            ("request", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="replies", to="academy.ccisupportrequest")),
        ]),
        migrations.AddIndex(model_name="ccisupportrequest", index=models.Index(fields=["institution", "status", "updated_at"], name="academy_ccis_institu_21c48b_idx")),
        migrations.AddIndex(model_name="ccisupportrequest", index=models.Index(fields=["requester", "status"], name="academy_ccis_request_0bba76_idx")),
    ]
