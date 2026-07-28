from django.contrib import admin

from .models import Event, TicketOrder, TicketTier

admin.site.register(Event)
admin.site.register(TicketTier)
admin.site.register(TicketOrder)
