from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import JobPostingViewSet, MyApplicationsView, ResumeView

router = DefaultRouter()
router.register("postings", JobPostingViewSet, basename="postings")

urlpatterns = [
    path("me/", MyApplicationsView.as_view()),
    path("resume/", ResumeView.as_view()),
    path("", include(router.urls)),
]
