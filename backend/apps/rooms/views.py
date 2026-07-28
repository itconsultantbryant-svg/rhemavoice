from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import RoomChatMessage, RoomParticipant, RoomPoll, VoiceRoom


class RoomChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomChatMessage
        fields = ["id", "display_name", "message", "is_pinned", "created_at"]


class RoomParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomParticipant
        fields = ["id", "display_name", "role", "is_muted", "hand_raised", "joined_at"]


class RoomPollSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomPoll
        fields = ["id", "question", "options", "is_active", "created_at"]


class VoiceRoomSerializer(serializers.ModelSerializer):
    participants_preview = serializers.SerializerMethodField()
    active_poll = serializers.SerializerMethodField()
    my_participation = serializers.SerializerMethodField()

    class Meta:
        model = VoiceRoom
        fields = [
            "id",
            "title",
            "description",
            "visibility",
            "topic",
            "is_live",
            "participant_count",
            "max_speakers",
            "host_name",
            "scheduled_at",
            "recording_enabled",
            "participants_preview",
            "active_poll",
            "my_participation",
            "created_at",
        ]

    def get_participants_preview(self, obj):
        return RoomParticipantSerializer(obj.participants.filter(is_banned=False)[:8], many=True).data

    def get_active_poll(self, obj):
        poll = obj.polls.filter(is_active=True).first()
        return RoomPollSerializer(poll).data if poll else None

    def get_my_participation(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        p = obj.participants.filter(user=request.user).first()
        return RoomParticipantSerializer(p).data if p else None


class VoiceRoomViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VoiceRoom.objects.prefetch_related("participants", "polls", "messages")
    serializer_class = VoiceRoomSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        room = self.get_object()
        participant, created = RoomParticipant.objects.get_or_create(
            room=room,
            user=request.user,
            defaults={
                "display_name": request.user.display_name or request.user.first_name or request.user.email,
                "role": "listener",
                "is_muted": True,
            },
        )
        if created:
            room.participant_count = room.participants.filter(is_banned=False).count()
            room.save(update_fields=["participant_count"])
        return Response(RoomParticipantSerializer(participant).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        room = self.get_object()
        RoomParticipant.objects.filter(room=room, user=request.user).delete()
        room.participant_count = room.participants.filter(is_banned=False).count()
        room.save(update_fields=["participant_count"])
        return Response({"detail": "Left room."})

    @action(detail=True, methods=["post"])
    def raise_hand(self, request, pk=None):
        room = self.get_object()
        participant, _ = RoomParticipant.objects.get_or_create(
            room=room,
            user=request.user,
            defaults={"display_name": request.user.display_name or request.user.first_name or request.user.email},
        )
        participant.hand_raised = not participant.hand_raised
        participant.save(update_fields=["hand_raised"])
        return Response(RoomParticipantSerializer(participant).data)

    @action(detail=True, methods=["post"])
    def mute(self, request, pk=None):
        room = self.get_object()
        participant = RoomParticipant.objects.filter(room=room, user=request.user).first()
        if not participant:
            return Response({"detail": "Join the room first."}, status=status.HTTP_400_BAD_REQUEST)
        participant.is_muted = bool(request.data.get("muted", not participant.is_muted))
        participant.save(update_fields=["is_muted"])
        return Response(RoomParticipantSerializer(participant).data)

    @action(detail=True, methods=["post"])
    def chat(self, request, pk=None):
        room = self.get_object()
        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"detail": "Message required."}, status=status.HTTP_400_BAD_REQUEST)
        msg = RoomChatMessage.objects.create(
            room=room,
            user=request.user,
            display_name=request.user.display_name or request.user.first_name or request.user.email,
            message=message,
        )
        return Response(RoomChatMessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        room = self.get_object()
        return Response(RoomChatMessageSerializer(room.messages.all()[:50], many=True).data)
