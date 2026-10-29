from django.db import migrations


def remove_retired_cci_roles(apps, schema_editor):
    CCIRoleAssignment = apps.get_model("academy", "CCIRoleAssignment")
    CCIRoleAssignment.objects.exclude(role__in=["administrator", "teacher", "advisor", "student"]).delete()


class Migration(migrations.Migration):
    dependencies = [("academy", "0016_alter_ccisupportreply_options_and_more")]

    operations = [migrations.RunPython(remove_retired_cci_roles, migrations.RunPython.noop)]
