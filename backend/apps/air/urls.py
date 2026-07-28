from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FlightListingViewSet, MyFlightBookingsView, TravelAgencyViewSet

router = DefaultRouter()
router.register("agencies", TravelAgencyViewSet, basename="air-agencies")
router.register("flights", FlightListingViewSet, basename="air-flights")

urlpatterns = [
    path("bookings/", MyFlightBookingsView.as_view({"get": "list"})),
    path("", include(router.urls)),
]
