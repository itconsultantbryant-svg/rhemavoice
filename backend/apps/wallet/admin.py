from django.contrib import admin

from .models import Transaction, WalletAccount

admin.site.register(WalletAccount)
admin.site.register(Transaction)
