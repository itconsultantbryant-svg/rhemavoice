from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Certificate, Course, CourseCategory, Enrollment, Institution, Lesson
from .serializers import (
    CertificateSerializer,
    CourseDetailSerializer,
    CourseSerializer,
    EnrollmentSerializer,
    InstitutionSerializer,
    LessonSerializer,
)


class InstitutionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Institution.objects.filter(is_active=True)
    serializer_class = InstitutionSerializer


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.filter(is_published=True).select_related("institution", "category").prefetch_related("lessons")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CourseDetailSerializer
        return CourseSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def enroll(self, request, pk=None):
        course = self.get_object()
        enrollment, created = Enrollment.objects.get_or_create(user=request.user, course=course)
        return Response(EnrollmentSerializer(enrollment, context={"request": request}).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def progress(self, request, pk=None):
        course = self.get_object()
        enrollment, _ = Enrollment.objects.get_or_create(user=request.user, course=course)
        progress = int(request.data.get("progress", enrollment.progress))
        enrollment.progress = max(0, min(100, progress))
        if enrollment.progress >= 100:
            enrollment.completed = True
            enrollment.xp_earned = course.xp_reward
            Certificate.objects.get_or_create(
                user=request.user,
                course=course,
                defaults={"code": f"RV-{str(course.id)[:8].upper()}-{str(request.user.id)[:6].upper()}"},
            )
        enrollment.save()
        return Response(EnrollmentSerializer(enrollment, context={"request": request}).data)


class MyLearningView(APIView):
    def get(self, request):
        enrollments = Enrollment.objects.filter(user=request.user).select_related("course", "course__institution")
        certificates = Certificate.objects.filter(user=request.user).select_related("course")
        return Response(
            {
                "enrollments": EnrollmentSerializer(enrollments, many=True, context={"request": request}).data,
                "certificates": CertificateSerializer(certificates, many=True).data,
                "categories": list(CourseCategory.objects.values("id", "name", "slug")),
            }
        )


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lesson.objects.select_related("course")
    serializer_class = LessonSerializer
