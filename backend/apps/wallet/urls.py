from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import WalletAccountViewSet

router = DefaultRouter()
router.register("", WalletAccountViewSet, basename="wallet")

urlpatterns = [
    path("", include(router.urls)),
]
