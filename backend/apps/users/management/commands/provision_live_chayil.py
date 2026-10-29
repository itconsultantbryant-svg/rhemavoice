"""Purge seeded operational data and provision live Chayil role accounts.

This command is intentionally opt-in: ``--purge-seeded-data`` is required
because it removes user-generated and demonstration records from every module.
It preserves platform configuration and the Chayil curriculum structure.
"""

from __future__ import annotations

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from apps.academy.models import AcademyMembership, CCIRoleAssignment, Course, CourseCategory, Institution, Lesson
from apps.modules.models import ModuleDefinition
from apps.roles.models import Permission, Role, UserRole
from apps.users.models import User


ACCOUNTS = {
    "administrator": {
        "email": "administrator@rhemavoice.app",
        "first_name": "Chayil",
        "last_name": "Administrator",
        "membership_role": "academy_admin",
        "cci_role": "administrator",
    },
    "teacher": {
        "email": "teacher@rhemavoice.app",
        "first_name": "Chayil",
        "last_name": "Teacher",
        "membership_role": "instructor",
        "cci_role": "teacher",
    },
    "advisor": {
        "email": "mentor@rhemavoice.app",
        "first_name": "Chayil",
        "last_name": "Advisor",
        "membership_role": "mentor",
        "cci_role": "advisor",
    },
    "student": {
        "email": "student@rhemavoice.app",
        "first_name": "Chayil",
        "last_name": "Student",
        "membership_role": "student",
        "cci_role": "student",
    },
}


class Command(BaseCommand):
    help = "Remove seeded operational data and create live Chayil role accounts."

    def add_arguments(self, parser):
        parser.add_argument("--purge-seeded-data", action="store_true")
        parser.add_argument(
            "--password",
            action="append",
            default=[],
            metavar="ROLE=PASSWORD",
            help="Provide one password for each role: administrator, teacher, advisor, student.",
        )

    def handle(self, *args, **options):
        if not options["purge_seeded_data"]:
            raise CommandError("Refusing to remove data without --purge-seeded-data.")

        passwords = {}
        for item in options["password"]:
            role, separator, password = item.partition("=")
            if not separator or role not in ACCOUNTS or not password:
                raise CommandError(f"Invalid password entry: {item!r}")
            passwords[role] = password
        missing = set(ACCOUNTS) - set(passwords)
        if missing:
            raise CommandError(f"Passwords are required for: {', '.join(sorted(missing))}.")

        chayil = Institution.objects.filter(code="chayil").first()
        if not chayil:
            raise CommandError("The Chayil institution must exist before provisioning accounts.")

        # These models constitute system configuration and Chayil's published
        # curriculum; every other app model is operational/seeded data.
        preserved = {
            Institution._meta.db_table,
            CourseCategory._meta.db_table,
            Course._meta.db_table,
            Lesson._meta.db_table,
            Role._meta.db_table,
            Permission._meta.db_table,
            Role.permissions.through._meta.db_table,
            ModuleDefinition._meta.db_table,
        }
        tables = {
            model._meta.db_table
            for model in apps.get_models(include_auto_created=True)
            if model._meta.managed
            and not model._meta.proxy
            and model._meta.app_label not in {"admin", "auth", "contenttypes", "sessions"}
            and model._meta.db_table not in preserved
        }

        with transaction.atomic():
            if tables:
                quoted = ", ".join(connection.ops.quote_name(table) for table in sorted(tables))
                with connection.cursor() as cursor:
                    cursor.execute(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE")

            # Other seeded academies and their curriculum are not part of the
            # retained Chayil structure.
            Course.objects.exclude(institution=chayil).delete()
            Institution.objects.exclude(pk=chayil.pk).delete()
            chayil.student_count = len(ACCOUNTS)
            chayil.save(update_fields=["student_count"])

            member_role, _ = Role.objects.get_or_create(code="member", defaults={"name": "Member"})
            users = {}
            for role, data in ACCOUNTS.items():
                user = User.objects.create_user(
                    username=data["email"],
                    email=data["email"],
                    password=passwords[role],
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    display_name=f"{data['first_name']} {data['last_name']}",
                )
                UserRole.objects.create(user=user, role=member_role)
                AcademyMembership.objects.create(
                    institution=chayil,
                    user=user,
                    role=data["membership_role"],
                )
                CCIRoleAssignment.objects.create(
                    institution=chayil,
                    user=user,
                    role=data["cci_role"],
                )
                users[role] = user

        for role, user in users.items():
            self.stdout.write(f"{role}: {user.email}")
