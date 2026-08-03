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
