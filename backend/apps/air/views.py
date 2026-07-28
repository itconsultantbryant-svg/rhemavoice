from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import FlightBooking, FlightListing, TravelAgency


class TravelAgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = TravelAgency
        fields = ["id", "name", "description", "city", "country", "phone", "rating_avg", "is_verified"]


class FlightListingSerializer(serializers.ModelSerializer):
    agency_name = serializers.CharField(source="agency.name", read_only=True)

    class Meta:
        model = FlightListing
        fields = [
            "id",
            "agency",
            "agency_name",
            "airline",
            "flight_number",
            "departure_city",
            "arrival_city",
            "departure_at",
            "arrival_at",
            "cabin_class",
            "stops",
            "price_cents",
            "currency",
        ]


class FlightBookingSerializer(serializers.ModelSerializer):
    route = serializers.SerializerMethodField()

    class Meta:
        model = FlightBooking
        fields = ["id", "flight", "route", "passengers", "passenger_name", "status", "created_at"]

    def get_route(self, obj):
        return f"{obj.flight.departure_city} → {obj.flight.arrival_city}"


class TravelAgencyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TravelAgency.objects.filter(is_verified=True)
    serializer_class = TravelAgencySerializer


class FlightListingViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FlightListing.objects.select_related("agency").all()
    serializer_class = FlightListingSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        departure = self.request.query_params.get("departure")
        arrival = self.request.query_params.get("arrival")
        if departure:
            qs = qs.filter(departure_city__icontains=departure)
        if arrival:
            qs = qs.filter(arrival_city__icontains=arrival)
        return qs

    @action(detail=True, methods=["post"])
    def book(self, request, pk=None):
        flight = self.get_object()
        booking = FlightBooking.objects.create(
            flight=flight,
            user=request.user,
            passengers=int(request.data.get("passengers", 1)),
            passenger_name=request.data.get("passenger_name", ""),
        )
        return Response(FlightBookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class MyFlightBookingsView(viewsets.ViewSet):
    def list(self, request):
        bookings = FlightBooking.objects.filter(user=request.user).select_related("flight")
        return Response(FlightBookingSerializer(bookings, many=True).data)
