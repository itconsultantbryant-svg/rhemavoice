from django.contrib.auth import get_user_model
from rest_framework import serializers, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MetricSnapshot

User = get_user_model()


class MetricSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetricSnapshot
        fields = ["id", "key", "label", "value", "unit", "module", "captured_for", "created_at"]


class MetricSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MetricSnapshot.objects.all()
    serializer_class = MetricSnapshotSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        module = self.request.query_params.get("module")
        if module:
            qs = qs.filter(module=module)
        return qs


class AnalyticsOverviewView(APIView):
    def _count(self, model_path):
        try:
            from django.apps import apps as django_apps

            app_label, model_name = model_path.split(".")
            model = django_apps.get_model(app_label, model_name)
            return model.objects.count()
        except Exception:
            return 0

    def get(self, request):
        cards = [
            {"key": "users", "label": "Total Users", "value": User.objects.count(), "module": "administration"},
            {"key": "courses", "label": "Courses", "value": self._count("academy.Course"), "module": "academy"},
            {"key": "streams", "label": "Streams", "value": self._count("streaming.Stream"), "module": "streaming"},
            {"key": "rooms", "label": "Voice Rooms", "value": self._count("rooms.VoiceRoom"), "module": "rooms"},
            {"key": "jobs", "label": "Job Postings", "value": self._count("jobs.JobPosting"), "module": "jobs"},
            {"key": "products", "label": "Marketplace Items", "value": self._count("marketplace.Product"), "module": "marketplace"},
            {"key": "orders", "label": "Orders", "value": self._count("marketplace.Order"), "module": "marketplace"},
            {"key": "messages", "label": "Messages", "value": self._count("chat.Message"), "module": "chat"},
        ]

        engagement = list(
            MetricSnapshot.objects.filter(module="engagement").order_by("captured_for").values("label", "value", "captured_for")
        )

        module_breakdown = [
            {"module": c["module"], "value": c["value"]} for c in cards if c["value"]
        ]

        return Response(
            {
                "cards": cards,
                "engagement_series": engagement,
                "module_breakdown": module_breakdown,
            }
        )
