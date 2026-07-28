from django.contrib import admin

from apps.modules.models import ModuleDefinition, ModuleProfile

admin.site.register(ModuleDefinition)
admin.site.register(ModuleProfile)
