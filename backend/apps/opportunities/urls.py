from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import MyOpportunitiesView, OpportunityViewSet

router = DefaultRouter()
router.register("", OpportunityViewSet, basename="opportunities")

urlpatterns = [
    path("me/", MyOpportunitiesView.as_view({"get": "list"})),
    path("", include(router.urls)),
]
