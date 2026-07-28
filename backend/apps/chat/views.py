from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Conversation, Message, Participant

User = get_user_model()


def _broadcast_message(conversation_id, payload):
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        layer = get_channel_layer()
        if layer:
            async_to_sync(layer.group_send)(
                f"chat_{conversation_id}",
                {"type": "chat.message", "payload": payload},
            )
    except Exception:
        pass


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()
    sender_id = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "body", "sender_name", "sender_id", "is_mine", "created_at"]

    def get_sender_name(self, obj):
        if not obj.sender:
            return "System"
        return obj.sender.get_full_name() or obj.sender.get_username()

    def get_sender_id(self, obj):
        return str(obj.sender_id) if obj.sender_id else None

    def get_is_mine(self, obj):
        request = self.context.get("request")
        return bool(request and obj.sender_id == request.user.id)


class ConversationSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    participant_names = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "title", "is_group", "last_message", "unread_count", "participant_names", "updated_at"]

    def get_last_message(self, obj):
        msg = obj.messages.last()
        return MessageSerializer(msg, context=self.context).data if msg else None

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not request:
            return 0
        membership = obj.memberships.filter(user=request.user).first()
        qs = obj.messages.exclude(sender=request.user)
        if membership and membership.last_read_at:
            qs = qs.filter(created_at__gt=membership.last_read_at)
        return qs.count()

    def get_participant_names(self, obj):
        return [p.get_full_name() or p.get_username() for p in obj.participants.all()[:5]]


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return (
            Conversation.objects.filter(participants=self.request.user)
            .prefetch_related("participants", "messages", "memberships")
            .distinct()
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def create(self, request, *args, **kwargs):
        title = request.data.get("title", "")
        participant_ids = request.data.get("participant_ids", [])
        is_group = bool(request.data.get("is_group", len(participant_ids) > 1))
        convo = Conversation.objects.create(title=title, is_group=is_group)
        Participant.objects.create(conversation=convo, user=request.user)
        for uid in participant_ids:
            user = User.objects.filter(id=uid).first()
            if user:
                Participant.objects.get_or_create(conversation=convo, user=user)
        return Response(self.get_serializer(convo).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        convo = self.get_object()
        if request.method == "POST":
            body = request.data.get("body", "").strip()
            if not body:
                return Response({"detail": "Message body required."}, status=status.HTTP_400_BAD_REQUEST)
            msg = Message.objects.create(conversation=convo, sender=request.user, body=body)
            convo.save(update_fields=["updated_at"])
            data = MessageSerializer(msg, context={"request": request}).data
            _broadcast_message(
                str(convo.id),
                {
                    "id": str(msg.id),
                    "body": msg.body,
                    "sender_name": request.user.get_full_name() or request.user.get_username(),
                    "sender_id": str(request.user.id),
                    "created_at": msg.created_at.isoformat(),
                },
            )
            return Response(data, status=status.HTTP_201_CREATED)
        Participant.objects.filter(conversation=convo, user=request.user).update(last_read_at=timezone.now())
        msgs = convo.messages.select_related("sender")
        return Response(MessageSerializer(msgs, many=True, context={"request": request}).data)
