from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserPreference


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = [
            "id",
            "key",
            "value",
            "notify_email",
            "notify_push",
            "notify_sms",
            "language",
            "updated_at",
        ]


class MyPreferencesView(APIView):
    def get(self, request):
        pref, _ = UserPreference.objects.get_or_create(user=request.user, defaults={"key": "defaults"})
        return Response(UserPreferenceSerializer(pref).data)

    def put(self, request):
        pref, _ = UserPreference.objects.get_or_create(user=request.user, defaults={"key": "defaults"})
        serializer = UserPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def patch(self, request):
        return self.put(request)
