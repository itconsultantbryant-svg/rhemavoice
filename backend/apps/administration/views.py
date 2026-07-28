from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.administration.models import AuditLog, FeatureToggle, SystemSetting
from apps.chat.models import Conversation, Message
from apps.jobs.models import JobApplication, JobPosting
from apps.marketplace.models import Order
from apps.roles.models import Role, UserRole
from apps.users.models import User
from apps.users.serializers import UserSerializer


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.is_superuser or "super_admin" in request.user.role_codes
        )


def _audit(actor, action, meta=None):
    AuditLog.objects.create(actor=actor, action=action, meta=meta or {})


class AdminUsersView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        users = User.objects.all()[:100]
        return Response(UserSerializer(users, many=True).data)


class AdminUserDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

        if "is_active" in request.data:
            user.is_active = bool(request.data["is_active"])
            user.save(update_fields=["is_active"])
            _audit(request.user, f"user.{'activate' if user.is_active else 'suspend'}:{user.email}")

        if "role_codes" in request.data:
            codes = request.data.get("role_codes") or []
            UserRole.objects.filter(user=user).delete()
            for code in codes:
                role = Role.objects.filter(code=code).first()
                if role:
                    UserRole.objects.get_or_create(user=user, role=role)
            _audit(request.user, f"user.roles:{user.email}", {"roles": codes})

        return Response(UserSerializer(user).data)


class AdminRolesView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        data = []
        for role in Role.objects.prefetch_related("permissions").all():
            data.append(
                {
                    "id": str(role.id),
                    "name": role.name,
                    "code": role.code,
                    "permissions": list(role.permissions.values_list("code", flat=True)),
                }
            )
        return Response(data)


class FeatureToggleListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        toggles = FeatureToggle.objects.all()
        return Response(
            [{"key": t.key, "label": t.label, "enabled": t.enabled, "description": t.description} for t in toggles]
        )


class FeatureToggleUpdateView(APIView):
    permission_classes = [IsSuperAdmin]

    def patch(self, request, key):
        try:
            toggle = FeatureToggle.objects.get(key=key)
        except FeatureToggle.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        toggle.enabled = bool(request.data.get("enabled", toggle.enabled))
        toggle.save(update_fields=["enabled"])
        _audit(request.user, f"feature_toggle.{key}={'on' if toggle.enabled else 'off'}")
        return Response({"key": toggle.key, "enabled": toggle.enabled, "label": toggle.label})


class AuditLogListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        logs = AuditLog.objects.select_related("actor")[:50]
        return Response(
            [
                {
                    "id": str(log.id),
                    "action": log.action,
                    "actor": getattr(log.actor, "email", "system"),
                    "created_at": log.created_at.isoformat(),
                }
                for log in logs
            ]
        )


class SystemSettingsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        settings = SystemSetting.objects.all()
        return Response([{ "key": s.key, "value": s.value } for s in settings])

    def put(self, request):
        key = request.data.get("key")
        if not key:
            return Response({"detail": "key required"}, status=status.HTTP_400_BAD_REQUEST)
        setting, _ = SystemSetting.objects.update_or_create(key=key, defaults={"value": request.data.get("value", {})})
        _audit(request.user, f"system_setting.{key}")
        return Response({"key": setting.key, "value": setting.value})


class AdminJobsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        jobs = JobPosting.objects.all()[:100]
        return Response(
            [
                {
                    "id": str(j.id),
                    "title": j.title,
                    "company_name": j.company_name,
                    "location": j.location,
                    "is_approved": j.is_approved,
                    "applications": j.applications.count(),
                    "created_at": j.created_at.isoformat(),
                }
                for j in jobs
            ]
        )


class AdminJobActionView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, job_id):
        try:
            job = JobPosting.objects.get(id=job_id)
        except JobPosting.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get("action")
        if action == "approve":
            job.is_approved = True
        elif action == "reject":
            job.is_approved = False
        else:
            return Response({"detail": "action must be approve|reject"}, status=status.HTTP_400_BAD_REQUEST)
        job.save(update_fields=["is_approved"])
        _audit(request.user, f"job.{action}:{job.title}")
        return Response({"id": str(job.id), "is_approved": job.is_approved})


class AdminApplicationsView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        apps = JobApplication.objects.select_related("job", "user")[:100]
        return Response(
            [
                {
                    "id": str(a.id),
                    "job_title": a.job.title,
                    "applicant": a.user.email,
                    "status": a.status,
                    "created_at": a.created_at.isoformat(),
                }
                for a in apps
            ]
        )

    def patch(self, request):
        app_id = request.data.get("id")
        try:
            application = JobApplication.objects.get(id=app_id)
        except JobApplication.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        new_status = request.data.get("status")
        if new_status not in dict(JobApplication.STATUS):
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
        application.status = new_status
        application.save(update_fields=["status"])
        _audit(request.user, f"application.{new_status}:{application.job.title}")
        return Response({"id": str(application.id), "status": application.status})


class AdminOrdersView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        orders = Order.objects.prefetch_related("items").all()[:100]
        return Response(
            [
                {
                    "id": str(o.id),
                    "reference": o.reference,
                    "user": o.user.email,
                    "total_cents": o.total_cents,
                    "status": o.status,
                    "source": o.source,
                    "items": [{"title": i.title, "quantity": i.quantity} for i in o.items.all()],
                    "created_at": o.created_at.isoformat(),
                }
                for o in orders
            ]
        )


class AdminOrderActionView(APIView):
    permission_classes = [IsSuperAdmin]

    def post(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get("action")
        mapping = {"fulfill": "fulfilled", "cancel": "cancelled", "refund": "refunded"}
        if action not in mapping:
            return Response({"detail": "action must be fulfill|cancel|refund"}, status=status.HTTP_400_BAD_REQUEST)
        order.status = mapping[action]
        order.save(update_fields=["status"])
        _audit(request.user, f"order.{action}:{order.reference}")
        return Response({"id": str(order.id), "status": order.status})


class AdminChatView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        convos = Conversation.objects.prefetch_related("participants", "messages")[:50]
        return Response(
            [
                {
                    "id": str(c.id),
                    "title": c.title,
                    "is_group": c.is_group,
                    "participants": [p.get_username() for p in c.participants.all()],
                    "message_count": c.messages.count(),
                    "updated_at": c.updated_at.isoformat(),
                }
                for c in convos
            ]
        )


class AdminChatModerateView(APIView):
    permission_classes = [IsSuperAdmin]

    def delete(self, request, message_id):
        try:
            msg = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        body = msg.body[:80]
        msg.delete()
        _audit(request.user, f"chat.delete_message:{body}")
        return Response({"detail": "Deleted"})
