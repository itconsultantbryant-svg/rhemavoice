from rest_framework import serializers

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
    Quiz,
)


class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = [
            "id",
            "code",
            "name",
            "tagline",
            "description",
            "logo_key",
            "primary_color",
            "accent_color",
            "program_weeks",
            "student_count",
            "is_featured",
            "is_active",
        ]


class CourseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseCategory
        fields = ["id", "name", "slug"]


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ["id", "title", "content", "order", "duration_min", "week_number", "is_downloadable"]


class QuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ["id", "title", "passing_score"]


class CourseSerializer(serializers.ModelSerializer):
    institution = InstitutionSerializer(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    lessons_count = serializers.SerializerMethodField()
    my_progress = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            "id",
            "title",
            "summary",
            "level",
            "week_number",
            "duration_hours",
            "xp_reward",
            "is_published",
            "is_live_eligible",
            "institution",
            "category_name",
            "lessons_count",
            "my_progress",
        ]

    def get_lessons_count(self, obj):
        return obj.lessons.count()

    def get_my_progress(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        enrollment = obj.enrollments.filter(user=request.user).first()
        if not enrollment:
            return None
        return {"progress": enrollment.progress, "xp_earned": enrollment.xp_earned, "completed": enrollment.completed}


class CourseDetailSerializer(CourseSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ["lessons"]


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = ["id", "course", "progress", "xp_earned", "completed", "created_at", "updated_at"]


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Certificate
        fields = ["id", "code", "course_title", "status", "issued_at"]


class LiveClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveClass
        fields = ["id", "title", "instructor_name", "starts_at", "status", "viewer_count", "week_number"]


class AssignmentSerializer(serializers.ModelSerializer):
    my_submission = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ["id", "title", "instructions", "due_at", "max_marks", "my_submission"]

    def get_my_submission(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        sub = obj.submissions.filter(user=request.user).first()
        if not sub:
            return None
        return {
            "id": str(sub.id),
            "status": sub.status,
            "file_name": sub.file_name,
            "score": sub.score,
            "notes": sub.notes,
        }


class LearningResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningResource
        fields = ["id", "title", "resource_type", "description", "url", "created_at"]


class AcademyEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademyEvent
        fields = ["id", "title", "event_type", "starts_at", "ends_at", "location"]


class MentorSerializer(serializers.Serializer):
    name = serializers.CharField()
    rating = serializers.FloatField()
    notes = serializers.CharField(allow_blank=True)
