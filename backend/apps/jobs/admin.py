from django.contrib import admin

from .models import Company, JobApplication, JobPosting, Resume, SavedJob

admin.site.register(Company)
admin.site.register(JobPosting)
admin.site.register(JobApplication)
admin.site.register(SavedJob)
admin.site.register(Resume)
