from django.contrib import admin

from .models import FlightBooking, FlightListing, TravelAgency

admin.site.register(TravelAgency)
admin.site.register(FlightListing)
admin.site.register(FlightBooking)
