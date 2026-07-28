from django.contrib import admin

from .models import Business, BusinessCategory, BusinessFavorite, BusinessProduct, BusinessReview

admin.site.register(BusinessCategory)
admin.site.register(Business)
admin.site.register(BusinessProduct)
admin.site.register(BusinessReview)
admin.site.register(BusinessFavorite)
