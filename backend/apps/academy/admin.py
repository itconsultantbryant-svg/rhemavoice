from django.contrib import admin
from django.contrib.auth.hashers import identify_hasher, make_password

from .models import (
    AcademyEvent,
    AcademyMembership,
    CCIAnnouncement,
    CCIAuditEvent,
    CCICredential,
    CCIRoleAssignment,
    CCIResource,
    CCIEvent,
    CCIAdmissionApplication,
    CCITask,
    Assignment,
    AssignmentSubmission,
    Certificate,
    Course,
    CourseContent,
    CourseCategory,
    Enrollment,
    FileAttachment,
    Institution,
    LearningResource,
    Lesson,
    LiveClass,
    MentorAssignment,
    Quiz,
)

admin.site.register(Institution)
admin.site.register(AcademyMembership)
admin.site.register(CCIRoleAssignment)


@admin.register(CCICredential)
class CCICredentialAdmin(admin.ModelAdmin):
    list_display = ("username", "user", "institution", "is_active", "last_login")
    list_filter = ("institution", "is_active")
    search_fields = ("username", "user__email")

    def save_model(self, request, obj, form, change):
        # Operators enter an issued password; never store it as plain text.
        try:
            identify_hasher(obj.password)
        except ValueError:
            obj.password = make_password(obj.password)
        super().save_model(request, obj, form, change)
admin.site.register(CCITask)
admin.site.register(CCIAnnouncement)
admin.site.register(CCIAuditEvent)
admin.site.register(CCIResource)
admin.site.register(CCIEvent)
admin.site.register(CCIAdmissionApplication)
admin.site.register(MentorAssignment)
admin.site.register(CourseCategory)
admin.site.register(Course)
admin.site.register(CourseContent)
admin.site.register(FileAttachment)
admin.site.register(Lesson)
admin.site.register(Quiz)
admin.site.register(Enrollment)
admin.site.register(Certificate)
admin.site.register(LiveClass)
admin.site.register(Assignment)
admin.site.register(AssignmentSubmission)
admin.site.register(LearningResource)
admin.site.register(AcademyEvent)
