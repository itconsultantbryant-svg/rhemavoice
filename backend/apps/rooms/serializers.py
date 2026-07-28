from rest_framework import serializers

from .models import VoiceRoom


class VoiceRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceRoom
        fields = "__all__"
