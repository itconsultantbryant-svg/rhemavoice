from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [("academy", "0007_cci_admission_application"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(name="CCIFormationNote", fields=[
            ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
            ("summary", models.TextField()), ("visibility", models.CharField(max_length=20, default="staff", choices=[("staff", "Staff only"), ("student", "Visible to student")])),
            ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("author", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="authored_cci_formation_notes", to=settings.AUTH_USER_MODEL)),
            ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_formation_notes", to="academy.institution")),
            ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_formation_notes", to=settings.AUTH_USER_MODEL)),
        ], options={"ordering": ["-created_at"]}),
        migrations.AddIndex(model_name="cciformationnote", index=models.Index(fields=["institution", "student", "visibility"], name="academy_cc_institu_a2c8c9_idx")),
        migrations.CreateModel(name="CCIAttendanceRecord", fields=[
            ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
            ("status", models.CharField(max_length=20, choices=[("present", "Present"), ("late", "Late"), ("absent", "Absent"), ("excused", "Excused")])), ("note", models.TextField(blank=True, default="")), ("recorded_at", models.DateTimeField(auto_now_add=True)),
            ("event", models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name="attendance_records", to="academy.ccievent")),
            ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_attendance_records", to="academy.institution")),
            ("recorded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="recorded_cci_attendance", to=settings.AUTH_USER_MODEL)),
            ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_attendance_records", to=settings.AUTH_USER_MODEL)),
        ]),
        migrations.AddConstraint(model_name="cciattendancerecord", constraint=models.UniqueConstraint(fields=("institution", "student", "event"), name="unique_cci_attendance_event")),
        migrations.AddIndex(model_name="cciattendancerecord", index=models.Index(fields=["institution", "student", "recorded_at"], name="academy_cc_institu_20cd65_idx")),
    ]
