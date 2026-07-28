from django.contrib import admin

from .models import RoomChatMessage, RoomParticipant, RoomPoll, VoiceRoom

admin.site.register(VoiceRoom)
admin.site.register(RoomParticipant)
admin.site.register(RoomPoll)
admin.site.register(RoomChatMessage)
