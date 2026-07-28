from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MyTransportBookingsView, TransportProviderViewSet

router = DefaultRouter()
router.register("providers", TransportProviderViewSet, basename="transport-providers")

urlpatterns = [
    path("bookings/", MyTransportBookingsView.as_view({"get": "list"})),
    path("", include(router.urls)),
]
