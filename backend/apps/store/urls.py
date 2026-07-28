from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import StoreProductViewSet

router = DefaultRouter()
router.register("products", StoreProductViewSet, basename="store-products")

urlpatterns = [path("", include(router.urls))]
