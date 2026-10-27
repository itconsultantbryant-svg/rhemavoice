from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("academy", "0003_alter_course_options_alter_institution_options_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="CCIRoleAssignment",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("role", models.CharField(max_length=40, choices=[("founder", "Founder"), ("program_director", "Program Director"), ("curriculum_director", "Curriculum Director"), ("administration", "Administration"), ("formation_coordinator", "Formation Coordinator"), ("technology_director", "Technology Director"), ("communications_director", "Communications Director"), ("instructor", "Teacher / Instructor"), ("mentor", "Mentor"), ("student", "Student")])),
                ("is_active", models.BooleanField(default=True)),
                ("assigned_at", models.DateTimeField(auto_now_add=True)),
                ("assigned_by", models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_cci_roles", to=settings.AUTH_USER_MODEL)),
                ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_role_assignments", to="academy.institution")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_role_assignments", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(model_name="cciroleassignment", constraint=models.UniqueConstraint(fields=("institution", "user", "role"), name="unique_cci_role")),
        migrations.AddIndex(model_name="cciroleassignment", index=models.Index(fields=["institution", "user", "is_active"], name="academy_cc_institu_9f1e5a_idx")),
        migrations.CreateModel(
            name="CCITask",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("title", models.CharField(max_length=200)), ("description", models.TextField(blank=True, default="")),
                ("status", models.CharField(max_length=20, default="not_started", choices=[("not_started", "Not started"), ("in_progress", "In progress"), ("completed", "Completed"), ("cancelled", "Cancelled")])),
                ("due_at", models.DateTimeField(null=True, blank=True)), ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
                ("assigned_to", models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cci_tasks", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_cci_tasks", to=settings.AUTH_USER_MODEL)),
                ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_tasks", to="academy.institution")),
            ],
            options={"ordering": ["due_at", "created_at"]},
        ),
        migrations.AddIndex(model_name="ccitask", index=models.Index(fields=["institution", "status", "due_at"], name="academy_cc_institu_5dd84d_idx")),
        migrations.AddIndex(model_name="ccitask", index=models.Index(fields=["assigned_to", "status"], name="academy_cc_assigne_4f8ccc_idx")),
        migrations.CreateModel(
            name="CCIAnnouncement",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("title", models.CharField(max_length=200)), ("body", models.TextField()),
                ("audience", models.CharField(max_length=20, default="all", choices=[("all", "All participants"), ("staff", "Staff"), ("students", "Students")])),
                ("is_published", models.BooleanField(default=False)), ("published_at", models.DateTimeField(null=True, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="cci_announcements", to=settings.AUTH_USER_MODEL)),
                ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_announcements", to="academy.institution")),
            ],
            options={"ordering": ["-published_at", "-created_at"]},
        ),
        migrations.AddIndex(model_name="cciannouncement", index=models.Index(fields=["institution", "is_published", "audience"], name="academy_cc_institu_0e07d6_idx")),
        migrations.CreateModel(
            name="CCIAuditEvent",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("action", models.CharField(max_length=120)), ("target_type", models.CharField(max_length=80, blank=True, default="")),
                ("target_id", models.UUIDField(null=True, blank=True)), ("meta", models.JSONField(default=dict, blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cci_audit_events", to=settings.AUTH_USER_MODEL)),
                ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_audit_events", to="academy.institution")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(model_name="cciauditevent", index=models.Index(fields=["institution", "created_at"], name="academy_cc_institu_3a2cd2_idx")),
        migrations.AddIndex(model_name="cciauditevent", index=models.Index(fields=["target_type", "target_id"], name="academy_cc_target__4704e6_idx")),
    ]
