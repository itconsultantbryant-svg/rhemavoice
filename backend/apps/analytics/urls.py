from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AnalyticsOverviewView, MetricSnapshotViewSet

router = DefaultRouter()
router.register("snapshots", MetricSnapshotViewSet, basename="analytics")

urlpatterns = [
    path("overview/", AnalyticsOverviewView.as_view()),
    path("", include(router.urls)),
]
