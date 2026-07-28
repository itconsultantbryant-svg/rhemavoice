from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AlbumViewSet, ArtistViewSet, PlaylistViewSet, TrackViewSet

router = DefaultRouter()
router.register("tracks", TrackViewSet, basename="tracks")
router.register("artists", ArtistViewSet, basename="artists")
router.register("albums", AlbumViewSet, basename="albums")
router.register("playlists", PlaylistViewSet, basename="playlists")

urlpatterns = [path("", include(router.urls))]
