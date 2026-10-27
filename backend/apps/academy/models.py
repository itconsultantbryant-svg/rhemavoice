import uuid

from django.conf import settings
from django.db import models


class Institution(models.Model):
    """A tenant academy hosted on RhemaVoice (e.g. Chayil Company Intensive)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=200)
    tagline = models.CharField(max_length=240, blank=True, default="")
    description = models.TextField(blank=True, default="")
    logo_key = models.CharField(max_length=120, blank=True, default="chayil_logo")
    primary_color = models.CharField(max_length=20, blank=True, default="#100030")
    accent_color = models.CharField(max_length=20, blank=True, default="#DFA622")
    program_weeks = models.PositiveIntegerField(default=31)
    student_count = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_featured", "name"]

    def __str__(self):
        return self.name


class AcademyMembership(models.Model):
    """Links a user to one academy with an academy-scoped role."""

    ROLE = [
        ("student", "Student"),
        ("mentor", "Mentor"),
        ("instructor", "Instructor"),
        ("staff", "Staff"),
        ("academy_admin", "Academy Administrator"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="academy_memberships")
    role = models.CharField(max_length=40, choices=ROLE, default="student")
    current_week = models.PositiveIntegerField(default=1)
    overall_progress = models.PositiveIntegerField(default=0)
    attendance_pct = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("institution", "user")

    def __str__(self):
        return f"{self.user_id} @ {self.institution.code} ({self.role})"


class CCIRoleAssignment(models.Model):
    """A CCI responsibility attached to an existing Academy membership/user."""

    ROLE = [
        ("founder", "Founder"),
        ("program_director", "Program Director"),
        ("curriculum_director", "Curriculum Director"),
        ("administration", "Administration"),
        ("formation_coordinator", "Formation Coordinator"),
        ("technology_director", "Technology Director"),
        ("communications_director", "Communications Director"),
        ("instructor", "Teacher / Instructor"),
        ("mentor", "Mentor"),
        ("student", "Student"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_role_assignments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cci_role_assignments")
    role = models.CharField(max_length=40, choices=ROLE)
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_cci_roles"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["institution", "user", "role"], name="unique_cci_role")]
        indexes = [models.Index(fields=["institution", "user", "is_active"])]


class CCITask(models.Model):
    STATUS = [("not_started", "Not started"), ("in_progress", "In progress"), ("completed", "Completed"), ("cancelled", "Cancelled")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_tasks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS, default="not_started")
    due_at = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="cci_tasks"
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_cci_tasks")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_at", "created_at"]
        indexes = [models.Index(fields=["institution", "status", "due_at"]), models.Index(fields=["assigned_to", "status"])]


class CCIAnnouncement(models.Model):
    AUDIENCE = [("all", "All participants"), ("staff", "Staff"), ("students", "Students")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_announcements")
    title = models.CharField(max_length=200)
    body = models.TextField()
    audience = models.CharField(max_length=20, choices=AUDIENCE, default="all")
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cci_announcements")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        indexes = [models.Index(fields=["institution", "is_published", "audience"])]


class CCIAuditEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_audit_events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="cci_audit_events")
    action = models.CharField(max_length=120)
    target_type = models.CharField(max_length=80, blank=True, default="")
    target_id = models.UUIDField(null=True, blank=True)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["institution", "created_at"]), models.Index(fields=["target_type", "target_id"])]


class CCIResource(models.Model):
    """CCI resource metadata; binary storage is enabled only after a private provider is configured."""

    STATUS = [("draft", "Draft"), ("pending_review", "Pending review"), ("approved", "Approved"), ("rejected", "Rejected"), ("archived", "Archived")]
    ACCESS = [("staff", "CCI staff"), ("participants", "CCI participants")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_resources")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=80, blank=True, default="general")
    access_level = models.CharField(max_length=20, choices=ACCESS, default="participants")
    status = models.CharField(max_length=20, choices=STATUS, default="draft")
    storage_key = models.CharField(max_length=500, blank=True, default="")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_cci_resources")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_cci_resources"
    )
    review_note = models.TextField(blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["institution", "status", "access_level"]), models.Index(fields=["created_by", "status"])]


class CCIEvent(models.Model):
    AUDIENCE = [("all", "All participants"), ("staff", "Staff"), ("students", "Students")]
    STATUS = [("scheduled", "Scheduled"), ("cancelled", "Cancelled"), ("completed", "Completed")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_events")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    audience = models.CharField(max_length=20, choices=AUDIENCE, default="all")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS, default="scheduled")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="created_cci_events")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at"]
        indexes = [models.Index(fields=["institution", "status", "starts_at"]), models.Index(fields=["audience", "starts_at"])]


class CCIAdmissionApplication(models.Model):
    STATUS = [("draft", "Draft"), ("submitted", "Submitted"), ("under_review", "Under review"), ("accepted", "Accepted"), ("rejected", "Rejected"), ("withdrawn", "Withdrawn")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_admissions")
    applicant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cci_admissions")
    status = models.CharField(max_length=20, choices=STATUS, default="draft")
    fields = models.JSONField(default=dict, blank=True)
    reviewer_note = models.TextField(blank=True, default="")
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reviewed_cci_admissions")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["institution", "applicant"], name="unique_cci_admission_applicant")]
        indexes = [models.Index(fields=["institution", "status", "created_at"]), models.Index(fields=["applicant", "status"])]


class CCIFormationNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_formation_notes")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cci_formation_notes")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="authored_cci_formation_notes")
    summary = models.TextField()
    visibility = models.CharField(max_length=20, choices=[("staff", "Staff only"), ("student", "Visible to student")], default="staff")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["institution", "student", "visibility"])]


class CCIAttendanceRecord(models.Model):
    STATUS = [("present", "Present"), ("late", "Late"), ("absent", "Absent"), ("excused", "Excused")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_attendance_records")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cci_attendance_records")
    event = models.ForeignKey(CCIEvent, null=True, blank=True, on_delete=models.SET_NULL, related_name="attendance_records")
    status = models.CharField(max_length=20, choices=STATUS)
    note = models.TextField(blank=True, default="")
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="recorded_cci_attendance")
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["institution", "student", "event"], name="unique_cci_attendance_event")]
        indexes = [models.Index(fields=["institution", "student", "recorded_at"])]


class CCIGradeChange(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(AssignmentSubmission, on_delete=models.CASCADE, related_name="cci_grade_changes")
    previous_score = models.PositiveIntegerField(null=True, blank=True)
    new_score = models.PositiveIntegerField(null=True, blank=True)
    reason = models.TextField(blank=True, default="")
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cci_grade_changes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["submission", "created_at"])]


class CCIStaffPost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_staff_posts")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cci_staff_posts")
    body = models.TextField()
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["institution", "is_archived", "created_at"])]


class CCIBondingPost(models.Model):
    STATUS = [("pending", "Pending moderation"), ("approved", "Approved"), ("rejected", "Rejected")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="cci_bonding_posts")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cci_bonding_posts")
    body = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    moderation_note = models.TextField(blank=True, default="")
    moderated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="moderated_cci_bonding_posts")
    moderated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["institution", "status", "created_at"])]


class MentorAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="mentor_assignments")
    mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mentored_students"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="academy_mentors"
    )
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)
    notes = models.TextField(blank=True, default="")

    class Meta:
        unique_together = ("institution", "student")


class CourseCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        Institution, null=True, blank=True, on_delete=models.SET_NULL, related_name="courses"
    )
    category = models.ForeignKey(
        CourseCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name="courses"
    )
    title = models.CharField(max_length=200)
    summary = models.TextField(blank=True, default="")
    level = models.CharField(max_length=40, default="beginner")
    week_number = models.PositiveIntegerField(default=1)
    duration_hours = models.PositiveIntegerField(default=4)
    xp_reward = models.PositiveIntegerField(default=100)
    is_published = models.BooleanField(default=False)
    is_live_eligible = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["week_number", "title"]

    def __str__(self):
        return self.title


class Lesson(models.Model):
    STATUS_HINT = [("completed", "Completed"), ("in_progress", "In Progress"), ("locked", "Locked")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons", null=True, blank=True)
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)
    duration_min = models.PositiveIntegerField(default=15)
    week_number = models.PositiveIntegerField(default=1)
    is_downloadable = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["week_number", "order", "title"]

    def __str__(self):
        return self.title


class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="quizzes")
    title = models.CharField(max_length=200)
    passing_score = models.PositiveIntegerField(default=70)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Enrollment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    progress = models.PositiveIntegerField(default=0)
    xp_earned = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "course")


class Certificate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="certificates")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="certificates")
    institution = models.ForeignKey(
        Institution, null=True, blank=True, on_delete=models.SET_NULL, related_name="certificates"
    )
    code = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=40, default="on_track")
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code


class LiveClass(models.Model):
    STATUS = [("scheduled", "Scheduled"), ("live", "Live"), ("ended", "Ended")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="live_classes")
    title = models.CharField(max_length=200)
    instructor_name = models.CharField(max_length=120, blank=True, default="")
    starts_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default="scheduled")
    viewer_count = models.PositiveIntegerField(default=0)
    week_number = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["-starts_at"]
        verbose_name_plural = "live classes"


class Assignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="assignments")
    title = models.CharField(max_length=200)
    instructions = models.TextField(blank=True, default="")
    due_at = models.DateTimeField(null=True, blank=True)
    max_marks = models.PositiveIntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["due_at", "title"]


class AssignmentSubmission(models.Model):
    STATUS = [("draft", "Draft"), ("submitted", "Submitted"), ("graded", "Graded")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="submissions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assignment_submissions")
    notes = models.TextField(blank=True, default="")
    file_name = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS, default="draft")
    score = models.PositiveIntegerField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("assignment", "user")


class LearningResource(models.Model):
    TYPE = [
        ("video", "Video"),
        ("pdf", "PDF"),
        ("audio", "Audio"),
        ("document", "Document"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="resources")
    title = models.CharField(max_length=200)
    resource_type = models.CharField(max_length=20, choices=TYPE, default="document")
    description = models.TextField(blank=True, default="")
    url = models.URLField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title"]


class AcademyEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="events")
    title = models.CharField(max_length=200)
    event_type = models.CharField(max_length=40, blank=True, default="class")
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        ordering = ["starts_at"]
