from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AcademyEvent,
    AcademyMembership,
    Assignment,
    AssignmentSubmission,
    Certificate,
    Course,
    CourseCategory,
    Enrollment,
    Institution,
    LearningResource,
    Lesson,
    LiveClass,
    MentorAssignment,
)
from .serializers import (
    AcademyEventSerializer,
    AssignmentSerializer,
    CertificateSerializer,
    CourseDetailSerializer,
    CourseSerializer,
    EnrollmentSerializer,
    InstitutionSerializer,
    LearningResourceSerializer,
    LessonSerializer,
    LiveClassSerializer,
)


class InstitutionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Institution.objects.filter(is_active=True)
    serializer_class = InstitutionSerializer
    lookup_field = "code"

    @action(detail=True, methods=["get"])
    def dashboard(self, request, code=None):
        """Student dashboard scoped to one academy tenant."""
        institution = self.get_object()
        membership = AcademyMembership.objects.filter(
            institution=institution, user=request.user, is_active=True
        ).first()
        if not membership:
            # Auto-join as student for demo if enrolled in any course of this academy
            has_course = Enrollment.objects.filter(
                user=request.user, course__institution=institution
            ).exists()
            if has_course or request.user.is_staff:
                membership, _ = AcademyMembership.objects.get_or_create(
                    institution=institution,
                    user=request.user,
                    defaults={"role": "student", "current_week": 7, "overall_progress": 22, "attendance_pct": 96},
                )
            else:
                return Response(
                    {"detail": "You are not a member of this academy. Contact your academy administrator."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        mentor_link = MentorAssignment.objects.filter(institution=institution, student=request.user).select_related(
            "mentor"
        ).first()
        mentor = None
        if mentor_link:
            mentor = {
                "name": mentor_link.mentor.display_name
                or mentor_link.mentor.get_full_name()
                or mentor_link.mentor.email,
                "rating": float(mentor_link.rating),
                "notes": mentor_link.notes,
            }

        live = LiveClass.objects.filter(institution=institution).order_by("-starts_at")[:5]
        assignments = Assignment.objects.filter(institution=institution)[:10]
        submitted = AssignmentSubmission.objects.filter(
            user=request.user, assignment__institution=institution, status__in=["submitted", "graded"]
        ).count()
        total_assignments = assignments.count() if hasattr(assignments, "count") else len(list(assignments))
        # recount properly
        total_assignments = Assignment.objects.filter(institution=institution).count()
        submitted = AssignmentSubmission.objects.filter(
            user=request.user, assignment__institution=institution, status__in=["submitted", "graded"]
        ).count()

        courses = Course.objects.filter(institution=institution, is_published=True).prefetch_related("lessons")
        weeks = {}
        for course in courses:
            for lesson in course.lessons.all():
                w = lesson.week_number or course.week_number or 1
                weeks.setdefault(w, []).append(
                    {
                        "id": str(lesson.id),
                        "title": lesson.title,
                        "course": course.title,
                        "duration_min": lesson.duration_min,
                        "status": (
                            "completed"
                            if membership.current_week > w
                            else "in_progress"
                            if membership.current_week == w
                            else "locked"
                        ),
                    }
                )

        curriculum = [
            {"week": w, "sessions": sessions}
            for w, sessions in sorted(weeks.items(), key=lambda x: x[0])
        ]

        events = AcademyEvent.objects.filter(institution=institution).order_by("starts_at")[:20]
        resources = LearningResource.objects.filter(institution=institution)[:30]
        certificates = Certificate.objects.filter(user=request.user, institution=institution)

        return Response(
            {
                "institution": InstitutionSerializer(institution).data,
                "membership": {
                    "role": membership.role,
                    "current_week": membership.current_week,
                    "overall_progress": membership.overall_progress,
                    "attendance_pct": membership.attendance_pct,
                    "program_weeks": institution.program_weeks,
                },
                "student_name": request.user.display_name
                or request.user.get_full_name()
                or request.user.email,
                "mentor": mentor,
                "stats": {
                    "attendance_pct": membership.attendance_pct,
                    "assignments_done": submitted,
                    "assignments_total": total_assignments,
                },
                "live_classes": LiveClassSerializer(live, many=True).data,
                "assignments": AssignmentSerializer(assignments, many=True, context={"request": request}).data,
                "curriculum": curriculum,
                "events": AcademyEventSerializer(events, many=True).data,
                "resources": LearningResourceSerializer(resources, many=True).data,
                "certificates": CertificateSerializer(certificates, many=True).data,
                "powered_by": "RhemaVoice",
            }
        )


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Course.objects.filter(is_published=True).select_related("institution", "category").prefetch_related(
        "lessons"
    )

    def get_queryset(self):
        qs = super().get_queryset()
        code = self.request.query_params.get("institution")
        if code:
            qs = qs.filter(institution__code=code)
        return qs

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
        if course.institution_id:
            AcademyMembership.objects.get_or_create(
                institution=course.institution,
                user=request.user,
                defaults={"role": "student"},
            )
        return Response(
            EnrollmentSerializer(enrollment, context={"request": request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

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
                defaults={
                    "code": f"RV-{str(course.id)[:8].upper()}-{str(request.user.id)[:6].upper()}",
                    "institution": course.institution,
                    "status": "issued",
                },
            )
        enrollment.save()
        return Response(EnrollmentSerializer(enrollment, context={"request": request}).data)


class AssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Assignment.objects.select_related("institution")
    serializer_class = AssignmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        code = self.request.query_params.get("institution")
        if code:
            qs = qs.filter(institution__code=code)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        assignment = self.get_object()
        sub, _ = AssignmentSubmission.objects.update_or_create(
            assignment=assignment,
            user=request.user,
            defaults={
                "notes": request.data.get("notes", ""),
                "file_name": request.data.get("file_name", "submission.pdf"),
                "status": "submitted",
                "submitted_at": timezone.now(),
            },
        )
        return Response(
            {
                "id": str(sub.id),
                "status": sub.status,
                "file_name": sub.file_name,
                "submitted_at": sub.submitted_at,
            },
            status=status.HTTP_201_CREATED,
        )


class MyLearningView(APIView):
    def get(self, request):
        enrollments = Enrollment.objects.filter(user=request.user).select_related("course", "course__institution")
        certificates = Certificate.objects.filter(user=request.user).select_related("course")
        memberships = AcademyMembership.objects.filter(user=request.user, is_active=True).select_related(
            "institution"
        )
        return Response(
            {
                "enrollments": EnrollmentSerializer(enrollments, many=True, context={"request": request}).data,
                "certificates": CertificateSerializer(certificates, many=True).data,
                "categories": list(CourseCategory.objects.values("id", "name", "slug")),
                "academies": InstitutionSerializer([m.institution for m in memberships], many=True).data,
            }
        )


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lesson.objects.select_related("course")
    serializer_class = LessonSerializer
