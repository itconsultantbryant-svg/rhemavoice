from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [("academy", "0010_cci_staff_post"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(name="CCIBondingPost", fields=[
            ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
            ("body", models.TextField()), ("status", models.CharField(max_length=20, default="pending", choices=[("pending", "Pending moderation"), ("approved", "Approved"), ("rejected", "Rejected")])),
            ("moderation_note", models.TextField(blank=True, default="")), ("moderated_at", models.DateTimeField(null=True, blank=True)), ("created_at", models.DateTimeField(auto_now_add=True)),
            ("author", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="cci_bonding_posts", to=settings.AUTH_USER_MODEL)),
            ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_bonding_posts", to="academy.institution")),
            ("moderated_by", models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name="moderated_cci_bonding_posts", to=settings.AUTH_USER_MODEL)),
        ], options={"ordering": ["-created_at"]}),
        migrations.AddIndex(model_name="ccibondingpost", index=models.Index(fields=["institution", "status", "created_at"], name="academy_cc_institu_757455_idx")),
    ]
