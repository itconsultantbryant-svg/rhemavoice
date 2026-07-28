from django.contrib import admin

from .models import Certificate, Course, CourseCategory, Enrollment, Institution, Lesson, Quiz

admin.site.register(Institution)
admin.site.register(CourseCategory)
admin.site.register(Course)
admin.site.register(Lesson)
admin.site.register(Quiz)
admin.site.register(Enrollment)
admin.site.register(Certificate)
