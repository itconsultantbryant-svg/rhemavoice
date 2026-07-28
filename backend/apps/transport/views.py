from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import TransportBooking, TransportProvider


class TransportProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransportProvider
        fields = [
            "id",
            "name",
            "description",
            "city",
            "country",
            "phone",
            "services",
            "rating_avg",
            "is_verified",
        ]


class TransportBookingSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider.name", read_only=True)

    class Meta:
        model = TransportBooking
        fields = [
            "id",
            "provider",
            "provider_name",
            "pickup_location",
            "destination",
            "service_type",
            "notes",
            "status",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]


class TransportProviderViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TransportProvider.objects.filter(is_verified=True)
    serializer_class = TransportProviderSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        city = self.request.query_params.get("city")
        if city:
            qs = qs.filter(city__icontains=city)
        return qs

    @action(detail=True, methods=["post"])
    def book(self, request, pk=None):
        provider = self.get_object()
        booking = TransportBooking.objects.create(
            provider=provider,
            user=request.user,
            pickup_location=request.data.get("pickup_location", ""),
            destination=request.data.get("destination", ""),
            service_type=request.data.get("service_type", ""),
            notes=request.data.get("notes", ""),
        )
        return Response(TransportBookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class MyTransportBookingsView(viewsets.ViewSet):
    def list(self, request):
        bookings = TransportBooking.objects.filter(user=request.user).select_related("provider")
        return Response(TransportBookingSerializer(bookings, many=True).data)
