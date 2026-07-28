from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChurchViewSet

router = DefaultRouter()
router.register("", ChurchViewSet, basename="church")

urlpatterns = [
    path("", include(router.urls)),
]
