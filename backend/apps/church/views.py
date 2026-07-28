from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Church, ChurchEvent, ChurchMembership


class ChurchEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChurchEvent
        fields = ["id", "title", "description", "starts_at", "location", "created_at"]


class ChurchSerializer(serializers.ModelSerializer):
    is_member = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    upcoming_events = serializers.SerializerMethodField()

    class Meta:
        model = Church
        fields = [
            "id",
            "name",
            "city",
            "country",
            "description",
            "pastor_name",
            "website",
            "member_count",
            "is_verified",
            "is_member",
            "my_role",
            "upcoming_events",
            "created_at",
        ]

    def get_is_member(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.memberships.filter(user=request.user).exists())

    def get_my_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        m = obj.memberships.filter(user=request.user).first()
        return m.role if m else None

    def get_upcoming_events(self, obj):
        return ChurchEventSerializer(obj.events.all()[:5], many=True).data


class ChurchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Church.objects.prefetch_related("events", "memberships")
    serializer_class = ChurchSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        church = self.get_object()
        membership, created = ChurchMembership.objects.get_or_create(
            church=church, user=request.user, defaults={"role": request.data.get("role", "member")}
        )
        if created:
            church.member_count = church.memberships.count()
            church.save(update_fields=["member_count"])
        return Response(
            {"joined": True, "role": membership.role, "created": created},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        church = self.get_object()
        ChurchMembership.objects.filter(church=church, user=request.user).delete()
        church.member_count = church.memberships.count()
        church.save(update_fields=["member_count"])
        return Response({"joined": False})

    @action(detail=False, methods=["get"])
    def mine(self, request):
        churches = Church.objects.filter(memberships__user=request.user).distinct()
        return Response(self.get_serializer(churches, many=True).data)
