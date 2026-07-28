from django.contrib import admin

from .models import Album, Artist, MusicFavorite, Playlist, Track

admin.site.register(Artist)
admin.site.register(Album)
admin.site.register(Track)
admin.site.register(Playlist)
admin.site.register(MusicFavorite)
