from django.contrib import admin

from .models import Church, ChurchEvent, ChurchMembership

admin.site.register(Church)
admin.site.register(ChurchMembership)
admin.site.register(ChurchEvent)
