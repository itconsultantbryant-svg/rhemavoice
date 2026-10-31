from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("academy", "0017_remove_retired_cci_roles"),
    ]

    operations = [
        migrations.CreateModel(
            name="CCICredential",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("username", models.CharField(max_length=64)),
                ("password", models.CharField(max_length=256)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("last_login", models.DateTimeField(null=True, blank=True)),
                ("created_by", models.ForeignKey(null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, related_name="issued_cci_credentials", to=settings.AUTH_USER_MODEL)),
                ("institution", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_credentials", to="academy.institution")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="cci_credentials", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(model_name="ccicredential", constraint=models.UniqueConstraint(fields=("institution", "user"), name="unique_cci_credential_user")),
        migrations.AddConstraint(model_name="ccicredential", constraint=models.UniqueConstraint(fields=("institution", "username"), name="unique_cci_credential_username")),
    ]
