from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PaymentProviderView, PaymentViewSet, sandbox_confirm, webhook

router = DefaultRouter()
router.register("", PaymentViewSet, basename="payments")

urlpatterns = [
    path("providers/", PaymentProviderView.as_view()),
    path("sandbox/confirm/", sandbox_confirm),
    path("webhooks/<str:provider>/", webhook),
    path("", include(router.urls)),
]
