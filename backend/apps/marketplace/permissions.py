from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsModuleAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and (
            request.user.is_superuser or "super_admin" in getattr(request.user, "role_codes", [])
        )
