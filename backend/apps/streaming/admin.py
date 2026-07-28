from django.contrib import admin

from .models import PrayerRequest, Stream, StreamChatMessage

admin.site.register(Stream)
admin.site.register(StreamChatMessage)
admin.site.register(PrayerRequest)
