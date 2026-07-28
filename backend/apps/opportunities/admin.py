from django.contrib import admin

from .models import Opportunity, OpportunityApplication, SavedOpportunity

admin.site.register(Opportunity)
admin.site.register(SavedOpportunity)
admin.site.register(OpportunityApplication)
