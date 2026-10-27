from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [("academy", "0009_cci_grade_change"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(name="CCIStaffPost", fields=[
            ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
            ("body", models.TextField()), ("is_archived", models.BooleanField(default=False)), ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
            ("author", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="cci_staff_posts", to=settings.AUTH_USER_MODEL)),
            ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_staff_posts", to="academy.institution")),
        ], options={"ordering": ["-created_at"]}),
        migrations.AddIndex(model_name="ccistaffpost", index=models.Index(fields=["institution", "is_archived", "created_at"], name="academy_cc_institu_ae8a8e_idx")),
    ]
