from django.contrib import admin

from .models import Podcast, RadioFavorite, RadioStation

admin.site.register(RadioStation)
admin.site.register(Podcast)
admin.site.register(RadioFavorite)
