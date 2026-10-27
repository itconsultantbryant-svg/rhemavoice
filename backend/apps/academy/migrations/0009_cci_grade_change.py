from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [("academy", "0008_cci_formation_attendance"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(name="CCIGradeChange", fields=[
            ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
            ("previous_score", models.PositiveIntegerField(null=True, blank=True)), ("new_score", models.PositiveIntegerField(null=True, blank=True)), ("reason", models.TextField(blank=True, default="")), ("created_at", models.DateTimeField(auto_now_add=True)),
            ("changed_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="cci_grade_changes", to=settings.AUTH_USER_MODEL)),
            ("submission", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_grade_changes", to="academy.assignmentsubmission")),
        ], options={"ordering": ["-created_at"]}),
        migrations.AddIndex(model_name="ccigradechange", index=models.Index(fields=["submission", "created_at"], name="academy_cc_submiss_b7c283_idx")),
    ]
