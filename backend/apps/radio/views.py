from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Podcast, RadioFavorite, RadioStation


class PodcastSerializer(serializers.ModelSerializer):
    class Meta:
        model = Podcast
        fields = ["id", "title", "host", "duration_min", "description", "created_at"]


class RadioStationSerializer(serializers.ModelSerializer):
    is_favorite = serializers.SerializerMethodField()
    podcasts = PodcastSerializer(many=True, read_only=True)

    class Meta:
        model = RadioStation
        fields = [
            "id",
            "name",
            "genre",
            "description",
            "stream_url",
            "presenters",
            "is_live",
            "listeners",
            "is_favorite",
            "podcasts",
            "created_at",
        ]

    def get_is_favorite(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.favorites.filter(user=request.user).exists()


class RadioStationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RadioStation.objects.prefetch_related("podcasts", "favorites")
    serializer_class = RadioStationSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def favorite(self, request, pk=None):
        station = self.get_object()
        fav, created = RadioFavorite.objects.get_or_create(user=request.user, station=station)
        if not created:
            fav.delete()
            return Response({"favorited": False})
        return Response({"favorited": True}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def podcasts(self, request):
        return Response(PodcastSerializer(Podcast.objects.all()[:30], many=True).data)
