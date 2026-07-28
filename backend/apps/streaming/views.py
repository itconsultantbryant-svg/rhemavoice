from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import PrayerRequest, Stream, StreamChatMessage


class StreamChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = StreamChatMessage
        fields = ["id", "display_name", "message", "is_pinned", "created_at"]


class StreamSerializer(serializers.ModelSerializer):
    chat_preview = serializers.SerializerMethodField()

    class Meta:
        model = Stream
        fields = [
            "id",
            "title",
            "description",
            "status",
            "church_name",
            "series",
            "scheduled_at",
            "viewers",
            "duration_min",
            "is_featured",
            "playback_url",
            "chat_preview",
            "created_at",
        ]

    def get_chat_preview(self, obj):
        msgs = obj.chat_messages.all()[:5]
        return StreamChatMessageSerializer(msgs, many=True).data


class StreamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Stream.objects.all().prefetch_related("chat_messages")
    serializer_class = StreamSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["post"])
    def chat(self, request, pk=None):
        stream = self.get_object()
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"detail": "Message required."}, status=status.HTTP_400_BAD_REQUEST)
        msg = StreamChatMessage.objects.create(
            stream=stream,
            user=request.user,
            display_name=request.user.display_name or request.user.first_name or request.user.email,
            message=message,
        )
        return Response(StreamChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def pray(self, request, pk=None):
        stream = self.get_object()
        title = (request.data.get("title") or "").strip()
        if not title:
            return Response({"detail": "Title required."}, status=status.HTTP_400_BAD_REQUEST)
        prayer = PrayerRequest.objects.create(
            stream=stream,
            user=request.user,
            title=title,
            body=request.data.get("body", ""),
            is_anonymous=bool(request.data.get("is_anonymous", False)),
        )
        return Response({"id": str(prayer.id), "title": prayer.title}, status=status.HTTP_201_CREATED)
