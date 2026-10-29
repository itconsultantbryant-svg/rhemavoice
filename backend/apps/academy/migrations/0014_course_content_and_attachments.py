# Generated manually for the CCI course delivery and attachment workflow.
import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def normalize_cci_roles(apps, schema_editor):
    """Map retired CCI responsibilities to the four supported roles on any DB."""
    CCIRoleAssignment = apps.get_model("academy", "CCIRoleAssignment")
    CCICourseAssignment = apps.get_model("academy", "CCICourseAssignment")
    role_map = {
        "founder": "administrator", "program_director": "administrator", "administration": "administrator",
        "curriculum_director": "teacher", "instructor": "teacher",
        "formation_coordinator": "advisor", "mentor": "advisor",
    }
    keepers = {}
    duplicates = []
    for assignment in CCIRoleAssignment.objects.order_by("id"):
        role = role_map.get(assignment.role, assignment.role)
        key = (assignment.institution_id, assignment.user_id, role)
        if key in keepers:
            duplicates.append(assignment.pk)
        else:
            keepers[key] = (assignment, role)
    if duplicates:
        CCIRoleAssignment.objects.filter(pk__in=duplicates).delete()
    for assignment, role in keepers.values():
        if assignment.role != role:
            assignment.role = role
            assignment.save(update_fields=["role"])
    CCICourseAssignment.objects.filter(role="mentor").update(role="advisor")


class Migration(migrations.Migration):
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL), ("academy", "0013_cci_course_and_live_class_controls")]

    operations = [
        migrations.RunPython(normalize_cci_roles, migrations.RunPython.noop),
        migrations.AddField(
            model_name="assignment",
            name="course",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="assignments", to="academy.course"),
        ),
        migrations.CreateModel(
            name="CourseContent",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField(blank=True, default="")),
                ("content_type", models.CharField(choices=[("content", "Course content"), ("material", "Course material")], default="content", max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("course", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="course_contents", to="academy.course")),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_course_contents", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="FileAttachment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("owner_type", models.CharField(max_length=32)),
                ("owner_id", models.UUIDField()),
                ("file_name", models.CharField(max_length=255)),
                ("content_type", models.CharField(default="application/octet-stream", max_length=120)),
                ("file_size", models.PositiveIntegerField(default=0)),
                ("data", models.BinaryField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="file_attachments", to="academy.institution")),
                ("uploaded_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="uploaded_academy_files", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(model_name="fileattachment", index=models.Index(fields=["institution", "owner_type", "owner_id"], name="academy_fil_institu_8adf75_idx")),
        migrations.AlterField(model_name="ccicourseassignment", name="role", field=models.CharField(choices=[("teacher", "Teacher"), ("advisor", "Advisor")], max_length=16)),
    ]
