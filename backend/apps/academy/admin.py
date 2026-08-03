from django.contrib import admin

from .models import (
    AcademyEvent,
    AcademyMembership,
    Assignment,
    AssignmentSubmission,
    Certificate,
    Course,
    CourseCategory,
    Enrollment,
    Institution,
    LearningResource,
    Lesson,
    LiveClass,
    MentorAssignment,
    Quiz,
)

admin.site.register(Institution)
admin.site.register(AcademyMembership)
admin.site.register(MentorAssignment)
admin.site.register(CourseCategory)
admin.site.register(Course)
admin.site.register(Lesson)
admin.site.register(Quiz)
admin.site.register(Enrollment)
admin.site.register(Certificate)
admin.site.register(LiveClass)
admin.site.register(Assignment)
admin.site.register(AssignmentSubmission)
admin.site.register(LearningResource)
admin.site.register(AcademyEvent)
