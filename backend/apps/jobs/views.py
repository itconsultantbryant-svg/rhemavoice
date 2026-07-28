from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import JobApplication, JobPosting, Resume, SavedJob


class JobPostingSerializer(serializers.ModelSerializer):
    is_saved = serializers.SerializerMethodField()
    has_applied = serializers.SerializerMethodField()

    class Meta:
        model = JobPosting
        fields = [
            "id",
            "title",
            "company_name",
            "location",
            "employment_type",
            "is_remote",
            "description",
            "salary_range",
            "is_saved",
            "has_applied",
            "created_at",
        ]

    def get_is_saved(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.saves.filter(user=request.user).exists())

    def get_has_applied(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.applications.filter(user=request.user).exists())


class JobApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)
    company_name = serializers.CharField(source="job.company_name", read_only=True)

    class Meta:
        model = JobApplication
        fields = ["id", "job_title", "company_name", "status", "cover_note", "created_at"]


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ["headline", "summary", "skills", "experience", "updated_at"]


class JobPostingViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JobPosting.objects.filter(is_approved=True).prefetch_related("saves", "applications")
    serializer_class = JobPostingSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def save_job(self, request, pk=None):
        job = self.get_object()
        saved, created = SavedJob.objects.get_or_create(job=job, user=request.user)
        if not created:
            saved.delete()
            return Response({"saved": False})
        return Response({"saved": True}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        job = self.get_object()
        application, created = JobApplication.objects.get_or_create(
            job=job, user=request.user, defaults={"cover_note": request.data.get("cover_note", "")}
        )
        return Response(
            JobApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MyApplicationsView(APIView):
    def get(self, request):
        apps = JobApplication.objects.filter(user=request.user).select_related("job")
        saved = SavedJob.objects.filter(user=request.user).select_related("job")
        return Response(
            {
                "applications": JobApplicationSerializer(apps, many=True).data,
                "saved": JobPostingSerializer(
                    [s.job for s in saved], many=True, context={"request": request}
                ).data,
            }
        )


class ResumeView(APIView):
    def get(self, request):
        resume, _ = Resume.objects.get_or_create(user=request.user)
        return Response(ResumeSerializer(resume).data)

    def put(self, request):
        resume, _ = Resume.objects.get_or_create(user=request.user)
        serializer = ResumeSerializer(resume, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
