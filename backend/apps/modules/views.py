from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.modules.models import ModuleDefinition, ModuleProfile


class ModuleListView(APIView):
    def get(self, request):
        modules = ModuleDefinition.objects.filter(enabled=True)
        profiles = {
            p.module: p
            for p in ModuleProfile.objects.filter(user=request.user, completed=True)
        }
        data = []
        for m in modules:
            data.append(
                {
                    "id": m.code,
                    "name": m.name,
                    "description": m.description,
                    "icon": m.icon,
                    "requires_profile": m.requires_profile,
                    "profile_complete": (not m.requires_profile) or (m.code in profiles),
                    "route": m.route,
                    "enabled": m.enabled,
                }
            )
        return Response(data)


class ModuleProfileView(APIView):
    def get(self, request, module_id):
        try:
            profile = ModuleProfile.objects.get(user=request.user, module=module_id)
            return Response({"module": module_id, "completed": profile.completed, "data": profile.data})
        except ModuleProfile.DoesNotExist:
            return Response({"module": module_id, "completed": False, "data": {}})

    def post(self, request, module_id):
        if not ModuleDefinition.objects.filter(code=module_id, enabled=True).exists():
            return Response({"detail": "Unknown module."}, status=status.HTTP_404_NOT_FOUND)
        profile, _ = ModuleProfile.objects.update_or_create(
            user=request.user,
            module=module_id,
            defaults={"data": request.data, "completed": True},
        )
        return Response({"module": module_id, "completed": profile.completed, "data": profile.data})
