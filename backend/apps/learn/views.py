from rest_framework import serializers, viewsets

from .models import LearningArea, LearningSession, Lesson


class LearningAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningArea
        fields = ["id", "name", "slug", "description"]


class LessonSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source="area.name", read_only=True)

    class Meta:
        model = Lesson
        fields = ["id", "area", "area_name", "title", "description", "teacher_name", "is_voice", "created_at"]


class LearningSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningSession
        fields = ["id", "lesson", "title", "host_name", "status", "starts_at", "participant_count"]


class LearningAreaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LearningArea.objects.all()
    serializer_class = LearningAreaSerializer


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lesson.objects.select_related("area").all()
    serializer_class = LessonSerializer


class LearningSessionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LearningSession.objects.all()
    serializer_class = LearningSessionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return qs
