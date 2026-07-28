from rest_framework import serializers

from .models import WalletAccount


class WalletAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletAccount
        fields = "__all__"
