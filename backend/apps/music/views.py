from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Album, Artist, MusicFavorite, Playlist, Track


class ArtistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artist
        fields = ["id", "name", "bio"]


class AlbumSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source="artist.name", read_only=True)

    class Meta:
        model = Album
        fields = ["id", "title", "artist_name", "year"]


class TrackSerializer(serializers.ModelSerializer):
    is_favorite = serializers.SerializerMethodField()
    album_title = serializers.CharField(source="album.title", read_only=True, default="")

    class Meta:
        model = Track
        fields = [
            "id",
            "title",
            "artist",
            "album_title",
            "duration_sec",
            "lyrics",
            "genre",
            "play_count",
            "is_favorite",
        ]

    def get_is_favorite(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.favorites.filter(user=request.user).exists()


class PlaylistSerializer(serializers.ModelSerializer):
    tracks = TrackSerializer(many=True, read_only=True)

    class Meta:
        model = Playlist
        fields = ["id", "title", "is_public", "tracks", "created_at"]


class TrackViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Track.objects.select_related("album", "artist_ref")
    serializer_class = TrackSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def play(self, request, pk=None):
        track = self.get_object()
        track.play_count += 1
        track.save(update_fields=["play_count"])
        return Response(TrackSerializer(track, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def favorite(self, request, pk=None):
        track = self.get_object()
        fav, created = MusicFavorite.objects.get_or_create(user=request.user, track=track)
        if not created:
            fav.delete()
            return Response({"favorited": False})
        return Response({"favorited": True}, status=status.HTTP_201_CREATED)


class ArtistViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Artist.objects.all()
    serializer_class = ArtistSerializer


class AlbumViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Album.objects.select_related("artist")
    serializer_class = AlbumSerializer


class PlaylistViewSet(viewsets.ModelViewSet):
    serializer_class = PlaylistSerializer

    def get_queryset(self):
        return Playlist.objects.filter(user=self.request.user).prefetch_related("tracks")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def add_track(self, request, pk=None):
        playlist = self.get_object()
        track_id = request.data.get("track_id")
        try:
            track = Track.objects.get(id=track_id)
        except Track.DoesNotExist:
            return Response({"detail": "Track not found."}, status=status.HTTP_404_NOT_FOUND)
        playlist.tracks.add(track)
        return Response(PlaylistSerializer(playlist, context={"request": request}).data)
