from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CartView, CheckoutView, OrderViewSet, ProductViewSet

router = DefaultRouter()
router.register("products", ProductViewSet, basename="products")
router.register("orders", OrderViewSet, basename="orders")

urlpatterns = [
    path("cart/", CartView.as_view()),
    path("checkout/", CheckoutView.as_view()),
    path("", include(router.urls)),
]
