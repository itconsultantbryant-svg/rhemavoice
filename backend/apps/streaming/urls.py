from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import StreamViewSet

router = DefaultRouter()
router.register("", StreamViewSet, basename="streams")

urlpatterns = [
    path("", include(router.urls)),
]
