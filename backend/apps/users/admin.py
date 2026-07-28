from django.contrib import admin

from apps.users.models import OTPChallenge, User

admin.site.register(User)
admin.site.register(OTPChallenge)
