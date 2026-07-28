from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EventViewSet, MyTicketsView

router = DefaultRouter()
router.register("events", EventViewSet, basename="ticketing-events")

urlpatterns = [
    path("my-tickets/", MyTicketsView.as_view({"get": "list"})),
    path("", include(router.urls)),
]
