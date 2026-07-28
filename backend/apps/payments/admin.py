from django.contrib import admin

from .models import Payment, PaymentProvider

admin.site.register(PaymentProvider)
admin.site.register(Payment)
