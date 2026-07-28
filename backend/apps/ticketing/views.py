from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Event, TicketOrder, TicketTier


class TicketTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketTier
        fields = ["id", "name", "price_cents", "quantity_available"]


class EventSerializer(serializers.ModelSerializer):
    tiers = TicketTierSerializer(many=True, read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "organizer",
            "description",
            "venue",
            "city",
            "country",
            "starts_at",
            "category",
            "banner_url",
            "tiers",
        ]


class TicketOrderSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source="event.title", read_only=True)
    tier_name = serializers.CharField(source="tier.name", read_only=True)

    class Meta:
        model = TicketOrder
        fields = ["id", "event", "event_title", "tier", "tier_name", "quantity", "total_cents", "status", "created_at"]


class EventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Event.objects.filter(is_published=True).prefetch_related("tiers")
    serializer_class = EventSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__icontains=category)
        return qs

    @action(detail=True, methods=["post"])
    def purchase(self, request, pk=None):
        event = self.get_object()
        tier_id = request.data.get("tier_id")
        quantity = int(request.data.get("quantity", 1))
        try:
            tier = event.tiers.get(id=tier_id)
        except TicketTier.DoesNotExist:
            return Response({"detail": "Invalid ticket tier."}, status=status.HTTP_400_BAD_REQUEST)
        order = TicketOrder.objects.create(
            event=event,
            tier=tier,
            user=request.user,
            quantity=quantity,
            total_cents=tier.price_cents * quantity,
            status="paid",
        )
        return Response(TicketOrderSerializer(order).data, status=status.HTTP_201_CREATED)


class MyTicketsView(viewsets.ViewSet):
    def list(self, request):
        orders = TicketOrder.objects.filter(user=request.user).select_related("event", "tier")
        return Response(TicketOrderSerializer(orders, many=True).data)
