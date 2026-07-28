from django.contrib import admin

from .models import LearningArea, LearningSession, Lesson

admin.site.register(LearningArea)
admin.site.register(Lesson)
admin.site.register(LearningSession)
