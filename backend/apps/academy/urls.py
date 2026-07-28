from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CourseViewSet, InstitutionViewSet, LessonViewSet, MyLearningView

router = DefaultRouter()
router.register("institutions", InstitutionViewSet, basename="institutions")
router.register("courses", CourseViewSet, basename="courses")
router.register("lessons", LessonViewSet, basename="lessons")

urlpatterns = [
    path("me/", MyLearningView.as_view()),
    path("", include(router.urls)),
]
