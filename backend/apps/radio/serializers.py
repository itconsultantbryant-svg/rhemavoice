from rest_framework import serializers

from .models import RadioStation


class RadioStationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RadioStation
        fields = "__all__"
