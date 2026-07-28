from django.contrib import admin

from apps.roles.models import Permission, Role, UserRole

admin.site.register(Permission)
admin.site.register(Role)
admin.site.register(UserRole)
