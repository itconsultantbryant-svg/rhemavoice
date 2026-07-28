from django.contrib import admin

from apps.administration.models import AuditLog, FeatureToggle, SystemSetting

admin.site.register(FeatureToggle)
admin.site.register(AuditLog)
admin.site.register(SystemSetting)
