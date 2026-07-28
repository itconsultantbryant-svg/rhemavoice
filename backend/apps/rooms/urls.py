from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import VoiceRoomViewSet

router = DefaultRouter()
router.register("", VoiceRoomViewSet, basename="rooms")

urlpatterns = [path("", include(router.urls))]
