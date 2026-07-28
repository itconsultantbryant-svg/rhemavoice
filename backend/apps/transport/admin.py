from django.contrib import admin

from .models import TransportBooking, TransportProvider

admin.site.register(TransportProvider)
admin.site.register(TransportBooking)
