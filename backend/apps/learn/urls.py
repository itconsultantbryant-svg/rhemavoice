from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LearningAreaViewSet, LearningSessionViewSet, LessonViewSet

router = DefaultRouter()
router.register("areas", LearningAreaViewSet, basename="learn-areas")
router.register("lessons", LessonViewSet, basename="learn-lessons")
router.register("sessions", LearningSessionViewSet, basename="learn-sessions")

urlpatterns = [path("", include(router.urls))]
