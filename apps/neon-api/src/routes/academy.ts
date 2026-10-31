import { Hono, type Context } from "hono";
import { count, one, query, uuid } from "../db";
import { issueCciAccessToken, requireUser, verifyCciAccessToken } from "../auth";
import { hashPassword, verifyPassword } from "../password";
import { detail, fieldError, forbidden, notFound, respond } from "../http";
import { iso, num } from "../serializers";

export const academyRoutes = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INSTITUTION_COLUMNS =
  "id, code, name, tagline, description, logo_key, primary_color, accent_color, program_weeks, student_count, is_featured, is_active";

type InstitutionRow = {
  id: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  logo_key: string;
  primary_color: string;
  accent_color: string;
  program_weeks: number;
  student_count: number;
  is_featured: boolean;
  is_active: boolean;
};

type MembershipRow = {
  id: string;
  role: string;
  current_week: number;
  overall_progress: number;
  attendance_pct: number;
  is_active: boolean;
};

type CourseRow = {
  id: string;
  title: string;
  summary: string;
  level: string;
  week_number: number;
  duration_hours: number;
  xp_reward: number;
  is_published: boolean;
  is_live_eligible: boolean;
  category_name: string | null;
  lessons_count: number;
  inst_id: string | null;
  inst_code: string | null;
  inst_name: string | null;
  inst_tagline: string | null;
  inst_description: string | null;
  inst_logo_key: string | null;
  inst_primary_color: string | null;
  inst_accent_color: string | null;
  inst_program_weeks: number | null;
  inst_student_count: number | null;
  inst_is_featured: boolean | null;
  inst_is_active: boolean | null;
  enrollment_id: string | null;
  enrollment_progress: number | null;
  enrollment_xp_earned: number | null;
  enrollment_completed: boolean | null;
};

type LessonRow = {
  id: string;
  title: string;
  content: string;
  order: number;
  duration_min: number;
  week_number: number;
  is_downloadable: boolean;
};

type EnrollmentRow = {
  id: string;
  progress: number;
  xp_earned: number;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
};

type AssignmentRow = {
  id: string;
  title: string;
  instructions: string;
  due_at: Date | null;
  max_marks: number;
  sub_id: string | null;
  sub_status: string | null;
  sub_file_name: string | null;
  sub_score: number | null;
  sub_notes: string | null;
};

type CertificateRow = {
  id: string;
  code: string;
  course_title: string;
  status: string;
  issued_at: Date;
};

type LiveClassRow = {
  id: string;
  title: string;
  instructor_name: string;
  starts_at: Date | null;
  status: string;
  viewer_count: number;
  week_number: number;
  meeting_url?: string;
  course_id?: string | null;
  host_id?: string | null;
};

type EventRow = {
  id: string;
  title: string;
  event_type: string;
  starts_at: Date | null;
  ends_at: Date | null;
  location: string;
};

type ResourceRow = {
  id: string;
  title: string;
  resource_type: string;
  description: string;
  url: string;
  created_at: Date;
};

const COURSE_SELECT = `
  select c.id, c.title, c.summary, c.level, c.week_number, c.duration_hours, c.xp_reward,
         c.is_published, c.is_live_eligible,
         cat.name as category_name,
         (select count(*)::int from academy_lesson l where l.course_id = c.id) as lessons_count,
         i.id as inst_id, i.code as inst_code, i.name as inst_name, i.tagline as inst_tagline,
         i.description as inst_description, i.logo_key as inst_logo_key,
         i.primary_color as inst_primary_color, i.accent_color as inst_accent_color,
         i.program_weeks as inst_program_weeks, i.student_count as inst_student_count,
         i.is_featured as inst_is_featured, i.is_active as inst_is_active,
         e.id as enrollment_id, e.progress as enrollment_progress,
         e.xp_earned as enrollment_xp_earned, e.completed as enrollment_completed
    from academy_course c
    left join academy_coursecategory cat on cat.id = c.category_id
    left join academy_institution i on i.id = c.institution_id
    left join academy_enrollment e on e.course_id = c.id and e.user_id = $1`;

function serializeInstitution(row: InstitutionRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    logo_key: row.logo_key,
    primary_color: row.primary_color,
    accent_color: row.accent_color,
    program_weeks: row.program_weeks,
    student_count: row.student_count,
    is_featured: row.is_featured,
    is_active: row.is_active,
  };
}

function serializeCourse(row: CourseRow) {
  const institution = row.inst_id
    ? {
        id: row.inst_id,
        code: row.inst_code,
        name: row.inst_name,
        tagline: row.inst_tagline,
        description: row.inst_description,
        logo_key: row.inst_logo_key,
        primary_color: row.inst_primary_color,
        accent_color: row.inst_accent_color,
        program_weeks: row.inst_program_weeks,
        student_count: row.inst_student_count,
        is_featured: row.inst_is_featured,
        is_active: row.inst_is_active,
      }
    : null;

  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    level: row.level,
    week_number: row.week_number,
    duration_hours: row.duration_hours,
    xp_reward: row.xp_reward,
    is_published: row.is_published,
    is_live_eligible: row.is_live_eligible,
    institution,
    category_name: row.category_name ?? "",
    lessons_count: row.lessons_count,
    my_progress: row.enrollment_id
      ? {
          progress: row.enrollment_progress,
          xp_earned: row.enrollment_xp_earned,
          completed: row.enrollment_completed,
        }
      : null,
  };
}

function serializeLesson(row: LessonRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    order: row.order,
    duration_min: row.duration_min,
    week_number: row.week_number,
    is_downloadable: row.is_downloadable,
  };
}

function serializeEnrollment(row: EnrollmentRow, course: ReturnType<typeof serializeCourse>) {
  return {
    id: row.id,
    course,
    progress: row.progress,
    xp_earned: row.xp_earned,
    completed: row.completed,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  };
}

function serializeCertificate(row: CertificateRow) {
  return {
    id: row.id,
    code: row.code,
    course_title: row.course_title,
    status: row.status,
    issued_at: iso(row.issued_at),
  };
}

function serializeAssignment(row: AssignmentRow) {
  return {
    id: row.id,
    title: row.title,
    instructions: row.instructions,
    due_at: iso(row.due_at),
    max_marks: row.max_marks,
    my_submission: row.sub_id
      ? {
          id: row.sub_id,
          status: row.sub_status,
          file_name: row.sub_file_name,
          score: row.sub_score,
          notes: row.sub_notes,
        }
      : null,
  };
}

function serializeLiveClass(row: LiveClassRow) {
  return {
    id: row.id,
    title: row.title,
    instructor_name: row.instructor_name,
    starts_at: iso(row.starts_at),
    status: row.status,
    viewer_count: row.viewer_count,
    week_number: row.week_number,
  };
}

function serializeEvent(row: EventRow) {
  return {
    id: row.id,
    title: row.title,
    event_type: row.event_type,
    starts_at: iso(row.starts_at),
    ends_at: iso(row.ends_at),
    location: row.location,
  };
}

function serializeResource(row: ResourceRow) {
  return {
    id: row.id,
    title: row.title,
    resource_type: row.resource_type,
    description: row.description,
    url: row.url,
    created_at: iso(row.created_at),
  };
}

async function findCourse(userId: string, courseId: string): Promise<CourseRow | null> {
  if (!UUID_RE.test(courseId)) return null;
  return one<CourseRow>(`${COURSE_SELECT} where c.id = $2 and c.is_published = true`, [
    userId,
    courseId,
  ]);
}

academyRoutes.get("/institutions/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<InstitutionRow>(
    `select ${INSTITUTION_COLUMNS} from academy_institution where is_active = true
      order by is_featured desc, name asc`,
  );
  return c.json(rows.map(serializeInstitution));
});

academyRoutes.get("/institutions/:code/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const row = await one<InstitutionRow>(
    `select ${INSTITUTION_COLUMNS} from academy_institution where code = $1 and is_active = true`,
    [c.req.param("code")],
  );
  if (!row) return respond(c, notFound());
  return c.json(serializeInstitution(row));
});

academyRoutes.get("/institutions/:code/dashboard/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const institution = await one<InstitutionRow>(
    `select ${INSTITUTION_COLUMNS} from academy_institution where code = $1 and is_active = true`,
    [c.req.param("code")],
  );
  if (!institution) return respond(c, notFound());

  let membership = await one<MembershipRow>(
    `select id, role, current_week, overall_progress, attendance_pct, is_active
       from academy_academymembership
      where institution_id = $1 and user_id = $2 and is_active = true`,
    [institution.id, user.id],
  );

  if (!membership) {
    const enrolled = await one<{ n: number }>(
      `select 1 as n from academy_enrollment e
         join academy_course c on c.id = e.course_id
        where e.user_id = $1 and c.institution_id = $2
        limit 1`,
      [user.id, institution.id],
    );

    if (!enrolled && !user.is_staff) {
      return respond(
        c,
        forbidden("You are not a member of this academy. Contact your academy administrator."),
      );
    }

    // get_or_create only applies the defaults when the row has to be created.
    const existing = await one<MembershipRow>(
      `select id, role, current_week, overall_progress, attendance_pct, is_active
         from academy_academymembership
        where institution_id = $1 and user_id = $2`,
      [institution.id, user.id],
    );

    if (existing) {
      membership = existing;
    } else {
      const id = uuid();
      await query(
         `insert into academy_academymembership
            (id, institution_id, user_id, role, current_week, overall_progress, attendance_pct, is_active, joined_at)
          values ($1, $2, $3, 'student', 1, 0, 0, true, now())`,
        [id, institution.id, user.id],
      );
      membership = {
        id,
        role: "student",
        current_week: 1,
        overall_progress: 0,
        attendance_pct: 0,
        is_active: true,
      };
    }
  }

  const mentorLink = await one<{ rating: string; notes: string; mentor_id: string }>(
    `select rating, notes, mentor_id from academy_mentorassignment
      where institution_id = $1 and student_id = $2
      order by id asc limit 1`,
    [institution.id, user.id],
  );

  let mentor: { name: string; rating: number; notes: string } | null = null;
  if (mentorLink) {
    const mentorUser = await one<{
      display_name: string;
      first_name: string;
      last_name: string;
      email: string;
    }>(
      `select display_name, first_name, last_name, email from users_user where id = $1`,
      [mentorLink.mentor_id],
    );
    const fullName = mentorUser ? `${mentorUser.first_name} ${mentorUser.last_name}`.trim() : "";
    mentor = {
      name: mentorUser?.display_name || fullName || mentorUser?.email || "",
      rating: num(mentorLink.rating),
      notes: mentorLink.notes,
    };
  }

  const live = await query<LiveClassRow>(
    `select id, title, instructor_name, starts_at, status, viewer_count, week_number
       from academy_liveclass
      where institution_id = $1
      order by starts_at desc
      limit 5`,
    [institution.id],
  );

  const assignments = await query<AssignmentRow>(
    `select a.id, a.title, a.instructions, a.due_at, a.max_marks,
            s.id as sub_id, s.status as sub_status, s.file_name as sub_file_name,
            s.score as sub_score, s.notes as sub_notes
       from academy_assignment a
       left join academy_assignmentsubmission s on s.assignment_id = a.id and s.user_id = $2
      where a.institution_id = $1
        and (a.course_id is null or exists (select 1 from academy_enrollment e where e.course_id = a.course_id and e.user_id = $2))
      order by a.due_at asc, a.title asc
      limit 10`,
    [institution.id, user.id],
  );

  const totalAssignments = await count(
    `select count(*) as n from academy_assignment where institution_id = $1`,
    [institution.id],
  );
  const submittedAssignments = await count(
    `select count(*) as n from academy_assignmentsubmission s
       join academy_assignment a on a.id = s.assignment_id
      where s.user_id = $1 and a.institution_id = $2 and s.status in ('submitted', 'graded')`,
    [user.id, institution.id],
  );

  const courses = await query<{ id: string; title: string; week_number: number }>(
    `select id, title, week_number from academy_course
      where institution_id = $1 and is_published = true
      order by week_number asc, title asc`,
    [institution.id],
  );

  const lessons = await query<{
    id: string;
    course_id: string;
    title: string;
    week_number: number;
    duration_min: number;
  }>(
    `select l.id, l.course_id, l.title, l.week_number, l.duration_min
       from academy_lesson l
       join academy_course c on c.id = l.course_id
      where c.institution_id = $1 and c.is_published = true
      order by l.week_number asc, l.order asc, l.title asc`,
    [institution.id],
  );

  const lessonsByCourse = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const bucket = lessonsByCourse.get(lesson.course_id);
    if (bucket) bucket.push(lesson);
    else lessonsByCourse.set(lesson.course_id, [lesson]);
  }

  const weeks = new Map<
    number,
    Array<{ id: string; title: string; course: string; duration_min: number; status: string }>
  >();
  for (const course of courses) {
    for (const lesson of lessonsByCourse.get(course.id) ?? []) {
      const week = lesson.week_number || course.week_number || 1;
      const status =
        membership.current_week > week
          ? "completed"
          : membership.current_week === week
            ? "in_progress"
            : "locked";
      const bucket = weeks.get(week);
      const session = {
        id: lesson.id,
        title: lesson.title,
        course: course.title,
        duration_min: lesson.duration_min,
        status,
      };
      if (bucket) bucket.push(session);
      else weeks.set(week, [session]);
    }
  }
  const curriculum = [...weeks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, sessions]) => ({ week, sessions }));

  const events = await query<EventRow>(
    `select id, title, event_type, starts_at, ends_at, location from academy_academyevent
      where institution_id = $1
      order by starts_at asc
      limit 20`,
    [institution.id],
  );

  const resources = await query<ResourceRow>(
    `select id, title, resource_type, description, url, created_at from academy_learningresource
      where institution_id = $1
      order by title asc
      limit 30`,
    [institution.id],
  );

  const certificates = await query<CertificateRow>(
    `select c.id, c.code, c.status, c.issued_at, co.title as course_title
       from academy_certificate c
       join academy_course co on co.id = c.course_id
      where c.user_id = $1 and c.institution_id = $2`,
    [user.id, institution.id],
  );

  return c.json({
    institution: serializeInstitution(institution),
    membership: {
      role: membership.role,
      current_week: membership.current_week,
      overall_progress: membership.overall_progress,
      attendance_pct: membership.attendance_pct,
      program_weeks: institution.program_weeks,
    },
    student_name: user.display_name || `${user.first_name} ${user.last_name}`.trim() || user.email,
    mentor,
    stats: {
      attendance_pct: membership.attendance_pct,
      assignments_done: submittedAssignments,
      assignments_total: totalAssignments,
    },
    live_classes: live.map(serializeLiveClass),
    assignments: assignments.map(serializeAssignment),
    curriculum,
    events: events.map(serializeEvent),
    resources: resources.map(serializeResource),
    certificates: certificates.map(serializeCertificate),
    powered_by: "RhemaVoice",
  });
});

academyRoutes.get("/courses/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const code = c.req.query("institution");
  const params: unknown[] = [auth.user.id];
  let sql = `${COURSE_SELECT} where c.is_published = true`;
  if (code) {
    params.push(code);
    sql += ` and i.code = $${params.length}`;
  }
  sql += ` order by c.week_number asc, c.title asc`;

  const rows = await query<CourseRow>(sql, params);
  return c.json(rows.map(serializeCourse));
});

academyRoutes.get("/courses/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const row = await findCourse(auth.user.id, c.req.param("id"));
  if (!row) return respond(c, notFound());

  const lessons = await query<LessonRow>(
    `select id, title, content, "order", duration_min, week_number, is_downloadable
       from academy_lesson
      where course_id = $1
      order by week_number asc, "order" asc, title asc`,
    [row.id],
  );

  return c.json({ ...serializeCourse(row), lessons: lessons.map(serializeLesson) });
});

academyRoutes.post("/courses/:id/enroll/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const course = await findCourse(user.id, c.req.param("id"));
  if (!course) return respond(c, notFound());

  let enrollment = await one<EnrollmentRow>(
    `select id, progress, xp_earned, completed, created_at, updated_at
       from academy_enrollment where user_id = $1 and course_id = $2`,
    [user.id, course.id],
  );
  let created = false;
  if (!enrollment) {
    const id = uuid();
    await query(
      `insert into academy_enrollment (id, user_id, course_id, progress, xp_earned, completed, created_at, updated_at)
       values ($1, $2, $3, 0, 0, false, now(), now())`,
      [id, user.id, course.id],
    );
    enrollment = {
      id,
      progress: 0,
      xp_earned: 0,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
    };
    created = true;
  }

  if (course.inst_id) {
    const membership = await one<{ id: string }>(
      `select id from academy_academymembership where institution_id = $1 and user_id = $2`,
      [course.inst_id, user.id],
    );
    if (!membership) {
      await query(
        `insert into academy_academymembership
           (id, institution_id, user_id, role, current_week, overall_progress, attendance_pct, is_active, joined_at)
         values ($1, $2, $3, 'student', 1, 0, 0, true, now())`,
        [uuid(), course.inst_id, user.id],
      );
    }
  }

  const fresh = await findCourse(user.id, course.id);
  const saved = await one<EnrollmentRow>(
    `select id, progress, xp_earned, completed, created_at, updated_at
       from academy_enrollment where user_id = $1 and course_id = $2`,
    [user.id, course.id],
  );
  return c.json(
    serializeEnrollment(saved ?? enrollment, serializeCourse(fresh ?? course)),
    created ? 201 : 200,
  );
});

academyRoutes.post("/courses/:id/progress/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const course = await findCourse(user.id, c.req.param("id"));
  if (!course) return respond(c, notFound());

  let enrollment = await one<EnrollmentRow>(
    `select id, progress, xp_earned, completed, created_at, updated_at
       from academy_enrollment where user_id = $1 and course_id = $2`,
    [user.id, course.id],
  );
  if (!enrollment) {
    const id = uuid();
    await query(
      `insert into academy_enrollment (id, user_id, course_id, progress, xp_earned, completed, created_at, updated_at)
       values ($1, $2, $3, 0, 0, false, now(), now())`,
      [id, user.id, course.id],
    );
    enrollment = {
      id,
      progress: 0,
      xp_earned: 0,
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const raw = "progress" in body ? body.progress : enrollment.progress;
  const parsed =
    typeof raw === "number" ? Math.trunc(raw) : Number.parseInt(String(raw ?? ""), 10);
  const requested = Number.isFinite(parsed) ? parsed : enrollment.progress;
  const progress = Math.max(0, Math.min(100, requested));

  let completed = enrollment.completed;
  let xpEarned = enrollment.xp_earned;
  if (progress >= 100) {
    completed = true;
    xpEarned = course.xp_reward;
    const certificateCode = `RV-${course.id.slice(0, 8).toUpperCase()}-${user.id.slice(0, 6).toUpperCase()}`;
    const existing = await one<{ id: string }>(
      `select id from academy_certificate where user_id = $1 and course_id = $2`,
      [user.id, course.id],
    );
    if (!existing) {
      await query(
        `insert into academy_certificate (id, code, user_id, course_id, institution_id, status, issued_at)
         values ($1, $2, $3, $4, $5, 'issued', now())`,
        [uuid(), certificateCode, user.id, course.id, course.inst_id],
      );
    }
  }

  await query(
    `update academy_enrollment set progress = $1, xp_earned = $2, completed = $3, updated_at = now()
      where id = $4`,
    [progress, xpEarned, completed, enrollment.id],
  );

  const fresh = await findCourse(user.id, course.id);
  const saved = await one<EnrollmentRow>(
    `select id, progress, xp_earned, completed, created_at, updated_at
       from academy_enrollment where id = $1`,
    [enrollment.id],
  );
  return c.json(serializeEnrollment(saved ?? enrollment, serializeCourse(fresh ?? course)));
});

academyRoutes.get("/assignments/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const code = c.req.query("institution");
  const params: unknown[] = [auth.user.id];
  let sql = `
    select a.id, a.title, a.instructions, a.due_at, a.max_marks,
           s.id as sub_id, s.status as sub_status, s.file_name as sub_file_name,
           s.score as sub_score, s.notes as sub_notes
      from academy_assignment a
      left join academy_assignmentsubmission s on s.assignment_id = a.id and s.user_id = $1
      where (a.course_id is null or exists (select 1 from academy_enrollment e where e.course_id = a.course_id and e.user_id = $1))`;
  if (code) {
    params.push(code);
    sql += ` and a.institution_id in (select id from academy_institution where code = $${params.length})`;
  }
  sql += ` order by a.due_at asc, a.title asc`;

  const rows = await query<AssignmentRow>(sql, params);
  return c.json(rows.map(serializeAssignment));
});

academyRoutes.post("/assignments/:id/submit/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const assignmentId = c.req.param("id");
  if (!UUID_RE.test(assignmentId)) return respond(c, notFound());

  const assignment = await one<{ id: string; institution_id: string; course_id: string | null }>(
    `select id, institution_id, course_id from academy_assignment where id = $1`,
    [assignmentId],
  );
  if (!assignment) return respond(c, notFound());
  if (assignment.course_id) {
    const enrollment = await one<{ id: string }>(
      `select id from academy_enrollment where course_id = $1 and user_id = $2`,
      [assignment.course_id, user.id],
    );
    if (!enrollment) return respond(c, forbidden("Only students enrolled in this course can submit this assignment."));
  }

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const notes = "notes" in body ? String(body.notes ?? "") : "";
  const fileName = "file_name" in body ? String(body.file_name ?? "") : "submission.pdf";

  const existing = await one<{ id: string }>(
    `select id from academy_assignmentsubmission where assignment_id = $1 and user_id = $2`,
    [assignment.id, user.id],
  );

  let submissionId: string;
  if (existing) {
    submissionId = existing.id;
    await query(
      `update academy_assignmentsubmission
          set notes = $1, file_name = $2, status = 'submitted', submitted_at = now()
        where id = $3`,
      [notes, fileName, submissionId],
    );
  } else {
    submissionId = uuid();
    await query(
      `insert into academy_assignmentsubmission
         (id, assignment_id, user_id, notes, file_name, status, score, submitted_at)
       values ($1, $2, $3, $4, $5, 'submitted', null, now())`,
      [submissionId, assignment.id, user.id, notes, fileName],
    );
  }

  const saved = await one<{ id: string; status: string; file_name: string; submitted_at: Date | null }>(
    `select id, status, file_name, submitted_at from academy_assignmentsubmission where id = $1`,
    [submissionId],
  );

  let attachments: Array<{ id: string; file_name: string; content_type: string; file_size: number }> = [];
  try {
    attachments = await saveAttachments(assignment.institution_id, "assignment_submission", submissionId, user.id, body.attachments);
  } catch (error) {
    return respond(c, detail(error instanceof Error ? error.message : "Unable to save attachments."));
  }
  return c.json(
    {
      id: saved?.id ?? submissionId,
      status: saved?.status ?? "submitted",
       file_name: saved?.file_name ?? fileName,
       submitted_at: iso(saved?.submitted_at ?? null),
       attachments,
    },
    201,
  );
});

academyRoutes.get("/me/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const enrollments = await query<EnrollmentRow>(
    `select id, progress, xp_earned, completed, created_at, updated_at
       from academy_enrollment where user_id = $1`,
    [user.id],
  );

  const enrollmentCourses = await query<CourseRow>(
    `${COURSE_SELECT}
      where c.id in (select course_id from academy_enrollment where user_id = $1)`,
    [user.id],
  );
  const courseByEnrollment = new Map<string, CourseRow>();
  for (const row of enrollmentCourses) {
    if (row.enrollment_id) courseByEnrollment.set(row.enrollment_id, row);
  }

  const certificates = await query<CertificateRow>(
    `select c.id, c.code, c.status, c.issued_at, co.title as course_title
       from academy_certificate c
       join academy_course co on co.id = c.course_id
      where c.user_id = $1`,
    [user.id],
  );

  const categories = await query<{ id: string; name: string; slug: string }>(
    `select id, name, slug from academy_coursecategory`,
  );

  const academies = await query<InstitutionRow>(
    `select ${INSTITUTION_COLUMNS} from academy_institution
      where id in (select institution_id from academy_academymembership where user_id = $1 and is_active = true)`,
    [user.id],
  );

  return c.json({
    enrollments: enrollments.map((row) => {
      const course = courseByEnrollment.get(row.id) ?? emptyCourseRow();
      return serializeEnrollment(row, serializeCourse(course));
    }),
    certificates: certificates.map(serializeCertificate),
    categories: categories.map((row) => ({ id: row.id, name: row.name, slug: row.slug })),
    academies: academies.map(serializeInstitution),
  });
});

function emptyCourseRow(): CourseRow {
  return {
    id: "",
    title: "",
    summary: "",
    level: "beginner",
    week_number: 0,
    duration_hours: 0,
    xp_reward: 0,
    is_published: false,
    is_live_eligible: false,
    category_name: null,
    lessons_count: 0,
    inst_id: null,
    inst_code: null,
    inst_name: null,
    inst_tagline: null,
    inst_description: null,
    inst_logo_key: null,
    inst_primary_color: null,
    inst_accent_color: null,
    inst_program_weeks: null,
    inst_student_count: null,
    inst_is_featured: null,
    inst_is_active: null,
    enrollment_id: null,
    enrollment_progress: null,
    enrollment_xp_earned: null,
    enrollment_completed: null,
  };
}

// CCI has its own credentials and session. A RhemaVoice session identifies the
// person, but never authorizes the person to enter a CCI workspace.
const CCI_MANAGERS = new Set(["administrator"]);
const CCI_ANNOUNCERS = new Set(["administrator"]);
const CCI_ROLE_MANAGERS = new Set(["administrator"]);
const CCI_RESOURCE_REVIEWERS = new Set(["administrator"]);
const CCI_ADMISSIONS_STAFF = new Set(["administrator"]);
const CCI_ROLES = new Set(["administrator", "teacher", "advisor", "student"]);

type CCIContext = { institution: InstitutionRow; roles: string[]; canManage: boolean; isStaff: boolean };

type CCIWorkspaceRole = "administrator" | "teacher" | "student" | "advisor";

function cciWorkspaceRole(ctx: CCIContext, user: { is_superuser: boolean; roles: string[] }): CCIWorkspaceRole {
  if (user.is_superuser || user.roles.includes("super_admin") || user.roles.includes("platform_admin") || ctx.roles.includes("administrator")) return "administrator";
  if (ctx.roles.includes("teacher")) return "teacher";
  if (ctx.roles.includes("advisor")) return "advisor";
  return "student";
}

async function cciContext(c: Context, code: string, user: { id: string; is_superuser: boolean; roles: string[] }): Promise<CCIContext | null> {
  const institution = await one<InstitutionRow>(
    `select ${INSTITUTION_COLUMNS} from academy_institution where code = $1 and is_active = true`, [code],
  );
  if (!institution) return null;
  const cciToken = c.req.header("X-CCI-Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!cciToken || !(await verifyCciAccessToken(cciToken, user.id, institution.id))) return null;
  const member = await one<{ id: string }>(
    `select id from academy_academymembership where institution_id = $1 and user_id = $2 and is_active = true`,
    [institution.id, user.id],
  );
  const isPlatformAdmin = user.is_superuser || user.roles.includes("super_admin") || user.roles.includes("platform_admin");
  if (!member && !isPlatformAdmin) return null;
  const rows = await query<{ role: string }>(
    `select role from academy_cciroleassignment where institution_id = $1 and user_id = $2 and is_active = true`,
    [institution.id, user.id],
  );
  // Membership alone does not grant CCI access. A participant must also hold
  // one of the four explicitly supported CCI roles. Filtering here also makes
  // retired role values harmless while the data migration removes them.
  const roles = rows.map((r) => r.role).filter((role) => CCI_ROLES.has(role));
  if (!roles.length && !isPlatformAdmin) return null;
  const isStaff = isPlatformAdmin || roles.some((role) => role !== "student");
  return { institution, roles, canManage: isPlatformAdmin || roles.some((role) => CCI_MANAGERS.has(role)), isStaff };
}

academyRoutes.post("/institutions/:code/cci/login/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!username || !password) return respond(c, fieldError({ detail: ["Enter your CCI username and password."] }));
  const institution = await one<InstitutionRow>(`select ${INSTITUTION_COLUMNS} from academy_institution where code = $1 and is_active = true`, [c.req.param("code")]);
  if (!institution) return respond(c, notFound("CCI program not found."));
  const credential = await one<{ password: string }>(
    `select password from academy_ccicredential where institution_id = $1 and user_id = $2 and username = $3 and is_active = true`,
    [institution.id, auth.user.id, username],
  );
  if (!credential || !verifyPassword(password, credential.password)) return respond(c, forbidden("Invalid CCI credentials."));
  await query(`update academy_ccicredential set last_login = now() where institution_id = $1 and user_id = $2`, [institution.id, auth.user.id]);
  return c.json({ access: await issueCciAccessToken(auth.user.id, institution.id), expires_in: 1800 });
});

async function cciAudit(institutionId: string, actorId: string, action: string, targetType: string, targetId: string, meta: object = {}) {
  await query(
    `insert into academy_cciauditevent (id, institution_id, actor_id, action, target_type, target_id, meta, created_at)
     values ($1, $2, $3, $4, $5, $6::uuid, $7::jsonb, now())`,
    [uuid(), institutionId, actorId, action, targetType, targetId || null, JSON.stringify(meta)],
  );
}

function canManageCCIProgram(ctx: CCIContext | null, user: { is_superuser: boolean }) {
  return Boolean(ctx && (user.is_superuser || ctx.roles.some((role) => CCI_ROLE_MANAGERS.has(role))));
}

function serializeCCITask(row: { id: string; title: string; description: string; status: string; due_at: Date | null; assigned_to: string | null; created_at: Date; updated_at: Date }) {
  return { ...row, due_at: iso(row.due_at), created_at: iso(row.created_at), updated_at: iso(row.updated_at) };
}

academyRoutes.get("/institutions/:code/cci/command-center/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const taskScope = ctx.isStaff ? "institution_id = $1" : "institution_id = $1 and assigned_to_id = $2";
  const taskArgs = ctx.isStaff ? [ctx.institution.id] : [ctx.institution.id, auth.user.id];
  const tasks = await query<{ id: string; title: string; description: string; status: string; due_at: Date | null; assigned_to: string | null; created_at: Date; updated_at: Date }>(
    `select id, title, description, status, due_at, assigned_to_id as assigned_to, created_at, updated_at from academy_ccitask where ${taskScope} order by due_at nulls last, created_at desc limit 20`, taskArgs,
  );
  const announcements = await query<{ id: string; title: string; body: string; audience: string; published_at: Date | null }>(
    `select id, title, body, audience, published_at from academy_cciannouncement
      where institution_id = $1 and is_published = true and (audience = 'all' or audience = $2)
      order by published_at desc limit 10`, [ctx.institution.id, ctx.isStaff ? "staff" : "students"],
  );
  const openTasks = tasks.filter((task) => !["completed", "cancelled"].includes(task.status)).length;
  return c.json({
    institution: serializeInstitution(ctx.institution), roles: ctx.roles, can_manage: ctx.canManage,
    readiness: { total_tasks: tasks.length, open_tasks: openTasks, completed_tasks: tasks.filter((task) => task.status === "completed").length },
    tasks: tasks.map(serializeCCITask), announcements: announcements.map((a) => ({ ...a, published_at: iso(a.published_at) })),
    integration_status: { file_storage: "pending_configuration", calendar: "pending_configuration", staff_connect: "not_started" },
  });
});

// The workspace is the role-aware entry point used by the Chayil web and
// mobile clients. It intentionally returns only aggregate data for staff and
// management roles; detailed records remain behind their existing endpoints.
academyRoutes.get("/institutions/:code/cci/workspace/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx) return respond(c, forbidden("Active CCI membership is required."));

  const role = cciWorkspaceRole(ctx, auth.user);
  const taskScope = ctx.isStaff ? "institution_id = $1" : "institution_id = $1 and assigned_to_id = $2";
  const taskArgs = ctx.isStaff ? [ctx.institution.id] : [ctx.institution.id, auth.user.id];
  const [tasks, announcements, memberCount, courseCount, submissionCount, sessionCount, auditCount] = await Promise.all([
    query<{ status: string; n: number }>(`select status, count(*)::int as n from academy_ccitask where ${taskScope} group by status`, taskArgs),
    query<{ id: string; title: string; body: string; audience: string; published_at: Date | null }>(
      `select id, title, body, audience, published_at from academy_cciannouncement
       where institution_id = $1 and is_published = true and (audience = 'all' or audience = $2)
       order by published_at desc limit 4`,
      [ctx.institution.id, ctx.isStaff ? "staff" : "students"],
    ),
    ctx.isStaff ? count(`select count(*) as n from academy_academymembership where institution_id = $1 and is_active = true`, [ctx.institution.id]) : Promise.resolve(0),
    ctx.isStaff ? count(`select count(*) as n from academy_course where institution_id = $1 and is_published = true`, [ctx.institution.id]) : Promise.resolve(0),
    role === "teacher" || role === "administrator"
      ? count(`select count(*) as n from academy_assignmentsubmission s join academy_assignment a on a.id = s.assignment_id where a.institution_id = $1 and s.status = 'submitted'`, [ctx.institution.id])
      : Promise.resolve(0),
    role === "advisor" ? count(`select count(*) as n from academy_mentorassignment where institution_id = $1 and mentor_id = $2`, [ctx.institution.id, auth.user.id]) : Promise.resolve(0),
    role === "administrator" ? count(`select count(*) as n from academy_cciauditevent where institution_id = $1`, [ctx.institution.id]) : Promise.resolve(0),
  ]);
  const counts = Object.fromEntries(tasks.map((row) => [row.status, num(row.n)]));
  const links: Record<CCIWorkspaceRole, Array<{ label: string; href: string; description: string }>> = {
    administrator: [
      { label: "People & roles", href: "members", description: "Maintain active academy roles" },
      { label: "Resources", href: "resources", description: "Manage approval-ready resources" },
      { label: "Calendar", href: "calendar", description: "Coordinate CCI events" },
      { label: "Community moderation", href: "bonding", description: "Review participant posts" },
      { label: "Courses & live classes", href: "learning", description: "Publish courses, assign people, and run online sessions" },
    ],
    teacher: [
      { label: "My teaching", href: "teacher", description: "Upload course content and create assignments for assigned courses" },
      { label: "Gradebook", href: "gradebook", description: "Review and grade submitted work" },
      { label: "Calendar", href: "calendar", description: "View program teaching dates" },
      { label: "Staff connect", href: "staff-connect", description: "Coordinate with program staff" },
    ],
    student: [
      { label: "My learning", href: "student-learning", description: "Courses, materials, and assignments enrolled for you" },
      { label: "My grades", href: "gradebook", description: "View graded assessment work" },
      { label: "Community", href: "bonding", description: "Encouragement and participant updates" },
      { label: "Calendar", href: "calendar", description: "Upcoming CCI events" },
    ],
    advisor: [
      { label: "My mentees", href: "mentees", description: "Open records for learners assigned to you" },
      { label: "Calendar", href: "calendar", description: "View program formation dates" },
      { label: "Staff connect", href: "staff-connect", description: "Coordinate learner support" },
      { label: "Community", href: "bonding", description: "Participant encouragement" },
    ],
  };
  return c.json({
    institution: serializeInstitution(ctx.institution), role, roles: ctx.roles,
    metrics: {
      open_tasks: (counts.not_started ?? 0) + (counts.in_progress ?? 0), completed_tasks: counts.completed ?? 0,
      members: memberCount, courses: courseCount, pending_submissions: submissionCount, mentees: sessionCount, audit_events: auditCount,
    },
    announcements: announcements.map((item) => ({ ...item, published_at: iso(item.published_at) })),
    links: links[role], can_manage: ctx.canManage,
  });
});

academyRoutes.post("/institutions/:code/cci/tasks/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !ctx.canManage) return respond(c, forbidden("CCI task-management permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title || title.length > 200) return respond(c, fieldError({ title: ["Enter a title of 200 characters or fewer."] }));
  const assignedTo = body.assigned_to ? String(body.assigned_to) : null;
  if (assignedTo && !UUID_RE.test(assignedTo)) return respond(c, fieldError({ assigned_to: ["Enter a valid user ID."] }));
  const dueAt = body.due_at ? new Date(String(body.due_at)) : null;
  if (body.due_at && (!dueAt || Number.isNaN(dueAt.getTime()))) return respond(c, fieldError({ due_at: ["Enter a valid date/time."] }));
  if (assignedTo) {
    const member = await one<{ id: string }>(`select id from academy_academymembership where institution_id = $1 and user_id = $2 and is_active = true`, [ctx.institution.id, assignedTo]);
    if (!member) return respond(c, fieldError({ assigned_to: ["Assignee must be an active CCI member."] }));
  }
  const id = uuid();
  await query(`insert into academy_ccitask (id, institution_id, title, description, status, due_at, assigned_to_id, created_by_id, created_at, updated_at) values ($1,$2,$3,$4,'not_started',$5,$6,$7,now(),now())`, [id, ctx.institution.id, title, String(body.description ?? "").trim(), dueAt, assignedTo, auth.user.id]);
  await cciAudit(ctx.institution.id, auth.user.id, "cci.task.created", "task", id, { assigned_to: assignedTo });
  const task = await one<{ id: string; title: string; description: string; status: string; due_at: Date | null; assigned_to: string | null; created_at: Date; updated_at: Date }>(`select id, title, description, status, due_at, assigned_to_id as assigned_to, created_at, updated_at from academy_ccitask where id = $1`, [id]);
  return c.json(serializeCCITask(task!), 201);
});

academyRoutes.patch("/institutions/:code/cci/tasks/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !UUID_RE.test(c.req.param("id"))) return respond(c, notFound());
  const task = await one<{ id: string; assigned_to: string | null }>(`select id, assigned_to_id as assigned_to from academy_ccitask where id = $1 and institution_id = $2`, [c.req.param("id"), ctx.institution.id]);
  if (!task) return respond(c, notFound());
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const status = String(body.status ?? "");
  if (!["not_started", "in_progress", "completed", "cancelled"].includes(status)) return respond(c, fieldError({ status: ["Enter a valid task status."] }));
  if (!ctx.canManage && task.assigned_to !== auth.user.id) return respond(c, forbidden("You can only update your assigned tasks."));
  await query(`update academy_ccitask set status = $1, updated_at = now() where id = $2`, [status, task.id]);
  await cciAudit(ctx.institution.id, auth.user.id, "cci.task.status_changed", "task", task.id, { status });
  return c.json({ id: task.id, status });
});

academyRoutes.post("/institutions/:code/cci/announcements/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !(ctx.canManage && (ctx.roles.some((role) => CCI_ANNOUNCERS.has(role)) || auth.user.is_superuser))) return respond(c, forbidden("CCI announcement permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim(); const message = String(body.body ?? "").trim(); const audience = String(body.audience ?? "all");
  if (!title || !message || title.length > 200 || !["all", "staff", "students"].includes(audience)) return respond(c, detail("A title, message, and valid audience are required."));
  const id = uuid();
  await query(`insert into academy_cciannouncement (id, institution_id, title, body, audience, is_published, published_at, created_by, created_at, updated_at) values ($1,$2,$3,$4,$5,true,now(),$6,now(),now())`, [id, ctx.institution.id, title, message, audience, auth.user.id]);
  await cciAudit(ctx.institution.id, auth.user.id, "cci.announcement.published", "announcement", id, { audience });
  return c.json({ id, title, body: message, audience, is_published: true }, 201);
});

academyRoutes.get("/institutions/:code/cci/members/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !ctx.canManage) return respond(c, forbidden("CCI staff permission is required."));
  const rows = await query<{
    user_id: string; email: string; first_name: string; last_name: string; display_name: string;
    membership_role: string; cci_role: string | null; cci_role_active: boolean | null; cci_username: string | null;
  }>(
      `select m.user_id, u.email, u.first_name, u.last_name, u.display_name, m.role as membership_role,
             r.role as cci_role, r.is_active as cci_role_active, cred.username as cci_username
       from academy_academymembership m join users_user u on u.id = m.user_id
       left join academy_cciroleassignment r on r.institution_id = m.institution_id and r.user_id = m.user_id
       left join academy_ccicredential cred on cred.institution_id = m.institution_id and cred.user_id = m.user_id
      where m.institution_id = $1 and m.is_active = true
      order by u.email, r.role`, [ctx.institution.id],
  );
  const members = new Map<string, { id: string; name: string; email: string; membership_role: string; cci_roles: string[]; cci_username: string | null }>();
  for (const row of rows) {
    const member = members.get(row.user_id) ?? {
      id: row.user_id, name: row.display_name || `${row.first_name} ${row.last_name}`.trim() || row.email,
      email: row.email, membership_role: row.membership_role, cci_roles: [], cci_username: row.cci_username,
    };
    if (row.cci_role && row.cci_role_active) member.cci_roles.push(row.cci_role);
    members.set(row.user_id, member);
  }
  return c.json([...members.values()]);
});

academyRoutes.patch("/institutions/:code/cci/members/:userId/credentials/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  const roleManager = ctx && (auth.user.is_superuser || ctx.roles.some((role) => CCI_ROLE_MANAGERS.has(role)));
  const userId = c.req.param("userId");
  if (!roleManager || !UUID_RE.test(userId)) return respond(c, forbidden("CCI member-management permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const username = String(body.cci_username ?? "").trim().toLowerCase();
  const password = String(body.cci_password ?? "");
  if (!/^[a-z0-9][a-z0-9._@-]{2,63}$/.test(username)) return respond(c, fieldError({ cci_username: ["Use 3–64 lowercase letters, numbers, dots, @ signs, hyphens, or underscores."] }));
  if (password && password.length < 12) return respond(c, fieldError({ cci_password: ["Use at least 12 characters for a reset password."] }));
  const credential = await one<{ id: string }>(`select id from academy_ccicredential where institution_id = $1 and user_id = $2`, [ctx!.institution.id, userId]);
  if (!credential) return respond(c, notFound("No CCI credential has been issued for this user."));
  const values: unknown[] = [username];
  const sets = ["username = $1", "is_active = true", "updated_at = now()"];
  if (password) { values.push(hashPassword(password)); sets.push(`password = $${values.length}`); }
  values.push(credential.id);
  await query(`update academy_ccicredential set ${sets.join(", ")} where id = $${values.length}`, values);
  await cciAudit(ctx!.institution.id, auth.user.id, "cci.credential.updated", "user", userId, { cci_username: username, password_reset: Boolean(password) });
  return c.json({ user_id: userId, cci_username: username, password_reset: Boolean(password) });
});

// CCI never creates a second RhemaVoice identity. Management and
// Administration can enroll an already-approved RhemaVoice user into CCI.
academyRoutes.post("/institutions/:code/cci/members/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
   const roleManager = ctx && (auth.user.is_superuser || ctx.roles.some((role) => CCI_ROLE_MANAGERS.has(role)));
  if (!roleManager) return respond(c, forbidden("CCI member-management permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const membershipRole = String(body.membership_role ?? "student");
  const cciRole = String(body.cci_role ?? "student");
  const username = String(body.cci_username ?? "").trim().toLowerCase();
  const password = String(body.cci_password ?? "");
  if (!email || !email.includes("@")) return respond(c, fieldError({ email: ["Enter a valid RhemaVoice email address."] }));
   if (!["student", "mentor", "instructor", "staff", "academy_admin"].includes(membershipRole)) return respond(c, fieldError({ membership_role: ["Enter a valid academy role."] }));
  if (!CCI_ROLES.has(cciRole)) return respond(c, fieldError({ cci_role: ["Enter a valid CCI role."] }));
  if (!/^[a-z0-9][a-z0-9._@-]{2,63}$/.test(username)) return respond(c, fieldError({ cci_username: ["Use 3–64 lowercase letters, numbers, dots, @ signs, hyphens, or underscores."] }));
  if (password.length < 12) return respond(c, fieldError({ cci_password: ["Set a temporary CCI password with at least 12 characters."] }));
  const user = await one<{ id: string; email: string }>(`select id, email from users_user where lower(email) = $1 and is_active = true and approval_status = 'approved'`, [email]);
   if (!user) return respond(c, detail("This user must first create and verify a RhemaVoice account."));
  const membership = await one<{ id: string }>(`select id from academy_academymembership where institution_id = $1 and user_id = $2`, [ctx!.institution.id, user.id]);
  if (membership) {
    await query(`update academy_academymembership set role = $1, is_active = true where id = $2`, [membershipRole, membership.id]);
  } else {
    await query(`insert into academy_academymembership (id, institution_id, user_id, role, current_week, overall_progress, attendance_pct, is_active, joined_at) values ($1,$2,$3,$4,1,0,0,true,now())`, [uuid(), ctx!.institution.id, user.id, membershipRole]);
  }
  const assignment = await one<{ id: string }>(`select id from academy_cciroleassignment where institution_id = $1 and user_id = $2 and role = $3`, [ctx!.institution.id, user.id, cciRole]);
  if (assignment) await query(`update academy_cciroleassignment set is_active = true, assigned_by_id = $1 where id = $2`, [auth.user.id, assignment.id]);
  else await query(`insert into academy_cciroleassignment (id, institution_id, user_id, role, is_active, assigned_by_id, assigned_at) values ($1,$2,$3,$4,true,$5,now())`, [uuid(), ctx!.institution.id, user.id, cciRole, auth.user.id]);
  const existingCredential = await one<{ id: string }>(`select id from academy_ccicredential where institution_id = $1 and user_id = $2`, [ctx!.institution.id, user.id]);
  if (existingCredential) await query(`update academy_ccicredential set username = $1, password = $2, is_active = true, updated_at = now() where id = $3`, [username, hashPassword(password), existingCredential.id]);
  else await query(`insert into academy_ccicredential (id, institution_id, user_id, username, password, is_active, created_by_id, created_at, updated_at) values ($1,$2,$3,$4,$5,true,$6,now(),now())`, [uuid(), ctx!.institution.id, user.id, username, hashPassword(password), auth.user.id]);
  await cciAudit(ctx!.institution.id, auth.user.id, "cci.member.enrolled", "user", user.id, { email, membership_role: membershipRole, cci_role: cciRole, cci_username: username });
  return c.json({ user_id: user.id, email: user.email, membership_role: membershipRole, cci_role: cciRole, cci_username: username }, 201);
});

academyRoutes.get("/institutions/:code/cci/courses/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const staff = ctx.isStaff;
  const rows = await query<{ id: string; title: string; summary: string; level: string; week_number: number; duration_hours: number; is_published: boolean; students: number; staff: number }>(
    `select c.id, c.title, c.summary, c.level, c.week_number, c.duration_hours, c.is_published,
      (select count(*)::int from academy_enrollment e where e.course_id=c.id) as students,
      (select count(*)::int from academy_ccicourseassignment a where a.course_id=c.id) as staff
     from academy_course c where c.institution_id=$1 ${staff ? "" : "and c.is_published=true"} order by c.week_number, c.title`, [ctx.institution.id]);
  return c.json(rows);
});

academyRoutes.post("/institutions/:code/cci/courses/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!canManageCCIProgram(ctx, auth.user)) return respond(c, forbidden("CCI management or administration permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim(); if (!title || title.length > 200) return respond(c, fieldError({ title: ["Enter a course title of 200 characters or fewer."] }));
  const week = Math.max(1, Number(body.week_number ?? 1) || 1); const hours = Math.max(1, Number(body.duration_hours ?? 1) || 1);
  const id = uuid();
  await query(`insert into academy_course (id, institution_id, title, summary, level, week_number, duration_hours, xp_reward, is_published, is_live_eligible, created_at) values ($1,$2,$3,$4,$5,$6,$7,100,$8,$9,now())`, [id, ctx!.institution.id, title, String(body.summary ?? ""), String(body.level ?? "beginner"), week, hours, body.is_published !== false, body.is_live_eligible === true]);
  await cciAudit(ctx!.institution.id, auth.user.id, "cci.course.created", "course", id, { title });
  return c.json({ id, title, week_number: week, is_published: body.is_published !== false }, 201);
});

academyRoutes.post("/institutions/:code/cci/courses/:id/assignments/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!canManageCCIProgram(ctx, auth.user) || !UUID_RE.test(c.req.param("id"))) return respond(c, forbidden("CCI management or administration permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const userId = String(body.user_id ?? ""); const role = String(body.role ?? "");
   if (!UUID_RE.test(userId) || !["teacher", "advisor"].includes(role)) return respond(c, fieldError({ role: ["Choose a teacher or advisor."] }));
  const course = await one<{ id: string }>(`select id from academy_course where id=$1 and institution_id=$2`, [c.req.param("id"), ctx!.institution.id]);
  const member = await one<{ id: string }>(`select id from academy_academymembership where institution_id=$1 and user_id=$2 and is_active=true`, [ctx!.institution.id, userId]);
  if (!course || !member) return respond(c, detail("Course and assignee must be active CCI records.", 404));
  await query(`insert into academy_ccicourseassignment (id, course_id, user_id, role, assigned_by_id, created_at) values ($1,$2,$3,$4,$5,now()) on conflict (course_id,user_id,role) do nothing`, [uuid(), course.id, userId, role, auth.user.id]);
  await cciAudit(ctx!.institution.id, auth.user.id, "cci.course.staff_assigned", "course", course.id, { user_id: userId, role });
  return c.json({ course_id: course.id, user_id: userId, role }, 201);
});

academyRoutes.post("/institutions/:code/cci/courses/:id/students/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!canManageCCIProgram(ctx, auth.user) || !UUID_RE.test(c.req.param("id"))) return respond(c, forbidden("CCI management or administration permission is required."));
  const userId = String(((await c.req.json().catch(() => ({}))) as Record<string, unknown>).user_id ?? "");
  if (!UUID_RE.test(userId)) return respond(c, fieldError({ user_id: ["Enter a valid student."] }));
  const course = await one<{ id: string }>(`select id from academy_course where id=$1 and institution_id=$2`, [c.req.param("id"), ctx!.institution.id]);
  const student = await one<{ id: string }>(`select m.id from academy_academymembership m join academy_cciroleassignment r on r.institution_id=m.institution_id and r.user_id=m.user_id and r.role='student' and r.is_active=true where m.institution_id=$1 and m.user_id=$2 and m.is_active=true`, [ctx!.institution.id, userId]);
  if (!course || !student) return respond(c, detail("Course and student must be active CCI records.", 404));
  await query(`insert into academy_enrollment (id,user_id,course_id,progress,xp_earned,completed,created_at,updated_at) values ($1,$2,$3,0,0,false,now(),now()) on conflict (user_id,course_id) do nothing`, [uuid(), userId, course.id]);
  await cciAudit(ctx!.institution.id, auth.user.id, "cci.course.student_enrolled", "course", course.id, { user_id: userId });
  return c.json({ course_id: course.id, user_id: userId }, 201);
});

type UploadInput = { file_name?: unknown; content_type?: unknown; data_base64?: unknown };
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function attachmentInputs(value: unknown): UploadInput[] {
  return Array.isArray(value) ? value.filter((item): item is UploadInput => Boolean(item) && typeof item === "object") : [];
}

async function saveAttachments(institutionId: string, ownerType: string, ownerId: string, uploadedBy: string, value: unknown) {
  const saved: Array<{ id: string; file_name: string; content_type: string; file_size: number }> = [];
  for (const input of attachmentInputs(value)) {
    const fileName = String(input.file_name ?? "").trim();
    const contentType = String(input.content_type ?? "application/octet-stream").trim();
    const encoded = String(input.data_base64 ?? "").replace(/^data:[^;]+;base64,/, "");
    if (!fileName || fileName.length > 255 || !encoded) throw new Error("Each attachment needs a file name and file data.");
    const data = Buffer.from(encoded, "base64");
    if (!data.length || data.length > MAX_ATTACHMENT_BYTES) throw new Error("Attachments must be between 1 byte and 10 MB.");
    const id = uuid();
    await query(
      `insert into academy_fileattachment (id, institution_id, owner_type, owner_id, file_name, content_type, file_size, data, uploaded_by_id, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())`,
      [id, institutionId, ownerType, ownerId, fileName, contentType.slice(0, 120), data.length, data, uploadedBy],
    );
    saved.push({ id, file_name: fileName, content_type: contentType, file_size: data.length });
  }
  return saved;
}

async function isCourseTeacherOrAdmin(ctx: CCIContext, userId: string, courseId: string, isSuperuser: boolean) {
  if (isSuperuser || ctx.roles.includes("administrator")) return true;
  return Boolean(await one<{ id: string }>(
    `select id from academy_ccicourseassignment where course_id = $1 and user_id = $2 and role = 'teacher'`,
    [courseId, userId],
  ));
}

async function canAccessCourse(ctx: CCIContext, userId: string, courseId: string, isSuperuser: boolean) {
  if (await isCourseTeacherOrAdmin(ctx, userId, courseId, isSuperuser)) return true;
  const enrolled = await one<{ id: string }>(`select id from academy_enrollment where course_id = $1 and user_id = $2`, [courseId, userId]);
  if (enrolled) return true;
  return Boolean(await one<{ id: string }>(`select id from academy_ccicourseassignment where course_id = $1 and user_id = $2 and role = 'advisor'`, [courseId, userId]));
}

academyRoutes.get("/institutions/:code/cci/courses/:id/content/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const courseId = c.req.param("id");
  if (!ctx || !UUID_RE.test(courseId) || !(await canAccessCourse(ctx, auth.user.id, courseId, auth.user.is_superuser))) return respond(c, forbidden("You are not enrolled in or assigned to this course."));
  const content = await query<{ id: string; title: string; body: string; content_type: string; created_at: Date }>(
    `select id, title, body, content_type, created_at from academy_coursecontent where course_id = $1 order by created_at desc`, [courseId],
  );
  const assignments = await query<{ id: string; title: string; instructions: string; due_at: Date | null; max_marks: number }>(
    `select id, title, instructions, due_at, max_marks from academy_assignment where course_id = $1 order by due_at asc nulls last, created_at desc`, [courseId],
  );
  const owners = [...content.map((item) => item.id), ...assignments.map((item) => item.id)];
  const attachments = owners.length ? await query<{ id: string; owner_id: string; file_name: string; content_type: string; file_size: number }>(
    `select id, owner_id, file_name, content_type, file_size from academy_fileattachment where owner_id = any($1::uuid[]) and owner_type in ('course_content', 'assignment') order by created_at`, [owners],
  ) : [];
  const filesFor = (id: string) => attachments.filter((file) => file.owner_id === id).map((file) => ({ ...file, download_url: `/academy/attachments/${file.id}/download/` }));
  return c.json({ content: content.map((item) => ({ ...item, created_at: iso(item.created_at), attachments: filesFor(item.id) })), assignments: assignments.map((item) => ({ ...item, due_at: iso(item.due_at), attachments: filesFor(item.id) })) });
});

academyRoutes.post("/institutions/:code/cci/courses/:id/content/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const courseId = c.req.param("id");
  if (!ctx || !UUID_RE.test(courseId) || !(await isCourseTeacherOrAdmin(ctx, auth.user.id, courseId, auth.user.is_superuser))) return respond(c, forbidden("Only the CCI administrator or assigned teacher can publish course content."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const title = String(body.title ?? "").trim(); const contentType = String(body.content_type ?? "content");
  if (!title || title.length > 200 || !["content", "material"].includes(contentType)) return respond(c, fieldError({ title: ["Enter a title and valid content type."] }));
  const course = await one<{ id: string }>(`select id from academy_course where id = $1 and institution_id = $2`, [courseId, ctx.institution.id]); if (!course) return respond(c, notFound());
  const id = uuid(); await query(`insert into academy_coursecontent (id, course_id, title, body, content_type, created_by_id, created_at) values ($1,$2,$3,$4,$5,$6,now())`, [id, courseId, title, String(body.body ?? ""), contentType, auth.user.id]);
  try { const attachments = await saveAttachments(ctx.institution.id, "course_content", id, auth.user.id, body.attachments); await cciAudit(ctx.institution.id, auth.user.id, "cci.course_content.published", "course_content", id, { course_id: courseId }); return c.json({ id, title, content_type: contentType, attachments }, 201); }
  catch (error) { await query(`delete from academy_coursecontent where id = $1`, [id]); return respond(c, detail(error instanceof Error ? error.message : "Unable to save attachments.")); }
});

academyRoutes.post("/institutions/:code/cci/courses/:id/assignments/create/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const courseId = c.req.param("id");
  if (!ctx || !UUID_RE.test(courseId) || !(await isCourseTeacherOrAdmin(ctx, auth.user.id, courseId, auth.user.is_superuser))) return respond(c, forbidden("Only the CCI administrator or assigned teacher can create course assignments."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const title = String(body.title ?? "").trim(); const dueAt = body.due_at ? new Date(String(body.due_at)) : null; const maxMarks = Number(body.max_marks ?? 100);
  if (!title || title.length > 200 || (dueAt && Number.isNaN(dueAt.getTime())) || !Number.isInteger(maxMarks) || maxMarks < 1) return respond(c, detail("Enter a valid title, due date, and maximum mark."));
  const course = await one<{ id: string }>(`select id from academy_course where id = $1 and institution_id = $2`, [courseId, ctx.institution.id]); if (!course) return respond(c, notFound());
  const id = uuid(); await query(`insert into academy_assignment (id, institution_id, course_id, title, instructions, due_at, max_marks, created_at) values ($1,$2,$3,$4,$5,$6,$7,now())`, [id, ctx.institution.id, courseId, title, String(body.instructions ?? ""), dueAt, maxMarks]);
  try { const attachments = await saveAttachments(ctx.institution.id, "assignment", id, auth.user.id, body.attachments); await cciAudit(ctx.institution.id, auth.user.id, "cci.assignment.created", "assignment", id, { course_id: courseId }); return c.json({ id, title, course_id: courseId, attachments }, 201); }
  catch (error) { await query(`delete from academy_assignment where id = $1`, [id]); return respond(c, detail(error instanceof Error ? error.message : "Unable to save attachments.")); }
});

academyRoutes.get("/attachments/:id/download/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const id = c.req.param("id"); if (!UUID_RE.test(id)) return respond(c, notFound());
  const file = await one<{ id: string; institution_id: string; owner_type: string; owner_id: string; file_name: string; content_type: string; data: Uint8Array }>(`select id, institution_id, owner_type, owner_id, file_name, content_type, data from academy_fileattachment where id = $1`, [id]);
  if (!file) return respond(c, notFound());
  const ctx = await cciContext(c, (await one<{ code: string }>(`select code from academy_institution where id = $1`, [file.institution_id]))?.code ?? "", auth.user);
  if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  let courseId: string | null = null;
  if (file.owner_type === "course_content") courseId = (await one<{ course_id: string }>(`select course_id from academy_coursecontent where id = $1`, [file.owner_id]))?.course_id ?? null;
  if (file.owner_type === "assignment") courseId = (await one<{ course_id: string | null }>(`select course_id from academy_assignment where id = $1`, [file.owner_id]))?.course_id ?? null;
  if (file.owner_type === "assignment_submission") {
    const submission = await one<{ course_id: string | null; user_id: string }>(`select a.course_id, s.user_id from academy_assignmentsubmission s join academy_assignment a on a.id = s.assignment_id where s.id = $1`, [file.owner_id]);
    if (!submission || (submission.user_id !== auth.user.id && !(submission.course_id && await isCourseTeacherOrAdmin(ctx, auth.user.id, submission.course_id, auth.user.is_superuser)))) return respond(c, forbidden("You cannot download this submission."));
    courseId = submission.course_id;
  }
  if (file.owner_type === "cci_resource") {
    const resource = await one<{ status: string; access_level: string }>(`select status, access_level from academy_cciresource where id = $1 and institution_id = $2`, [file.owner_id, ctx.institution.id]);
    if (!resource || (resource.status !== "approved" && !ctx.canManage) || (resource.access_level === "staff" && !ctx.isStaff)) return respond(c, forbidden("You cannot download this resource."));
    return new Response(Buffer.from(file.data), { headers: { "Content-Type": file.content_type || "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`, "Cache-Control": "private, no-store" } });
  }
  if (file.owner_type === "cci_support") {
    const request = await one<{ requester_id: string }>(`select requester_id from academy_ccisupportrequest where id = $1 and institution_id = $2`, [file.owner_id, ctx.institution.id]);
    if (!request || (request.requester_id !== auth.user.id && !canManageSupport(ctx, auth.user))) return respond(c, forbidden("You cannot download this support attachment."));
    return new Response(Buffer.from(file.data), { headers: { "Content-Type": file.content_type || "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`, "Cache-Control": "private, no-store" } });
  }
  if (!courseId || !(await canAccessCourse(ctx, auth.user.id, courseId, auth.user.is_superuser))) return respond(c, forbidden("You cannot download this file."));
  return new Response(Buffer.from(file.data), { headers: { "Content-Type": file.content_type || "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`, "Cache-Control": "private, no-store" } });
});

academyRoutes.get("/institutions/:code/cci/live-classes/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const rows = await query<LiveClassRow>(`select l.id,l.title,l.instructor_name,l.starts_at,l.status,l.viewer_count,l.week_number,l.meeting_url,l.course_id,l.host_id from academy_liveclass l where l.institution_id=$1 ${ctx.isStaff ? "" : "and exists (select 1 from academy_cciliveclassparticipant p where p.live_class_id=l.id and p.user_id=$2)"} order by l.starts_at desc`, ctx.isStaff ? [ctx.institution.id] : [ctx.institution.id, auth.user.id]);
  return c.json(rows.map((row) => ({ ...serializeLiveClass(row), meeting_url: row.meeting_url ?? "", course_id: row.course_id ?? null, host_id: row.host_id ?? null, join_available: row.status === "live" && /^https:\/\//.test(row.meeting_url ?? "") })));
});

academyRoutes.post("/institutions/:code/cci/live-classes/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!canManageCCIProgram(ctx, auth.user)) return respond(c, forbidden("CCI management or administration permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const title=String(body.title??"").trim(); const meetingUrl=String(body.meeting_url??"").trim(); const hostId=String(body.host_id??""); const courseId=body.course_id ? String(body.course_id) : null;
  const startsAt=body.starts_at ? new Date(String(body.starts_at)) : null;
  if (!title || !startsAt || Number.isNaN(startsAt.getTime()) || !/^https:\/\//.test(meetingUrl) || !UUID_RE.test(hostId)) return respond(c, detail("Title, start time, approved HTTPS meeting URL, and host are required."));
  if (courseId && !UUID_RE.test(courseId)) return respond(c, fieldError({ course_id: ["Enter a valid course."] }));
  const host = await one<{ id:string; name:string }>(`select u.id, coalesce(nullif(u.display_name,''),u.email) as name from users_user u join academy_academymembership m on m.user_id=u.id where u.id=$1 and m.institution_id=$2 and m.is_active=true`, [hostId,ctx!.institution.id]);
  const course = courseId ? await one<{id:string}>(`select id from academy_course where id=$1 and institution_id=$2`,[courseId,ctx!.institution.id]) : { id: null };
  if (!host || !course) return respond(c, detail("Host and course must be active CCI records.", 404));
  const id=uuid(); await query(`insert into academy_liveclass (id,institution_id,title,instructor_name,starts_at,status,viewer_count,week_number,course_id,host_id,meeting_url) values ($1,$2,$3,$4,$5,'scheduled',0,$6,$7,$8,$9)`,[id,ctx!.institution.id,title,host.name,startsAt,Math.max(1,Number(body.week_number??1)||1),course.id,host.id,meetingUrl]);
  await cciAudit(ctx!.institution.id,auth.user.id,"cci.live_class.created","live_class",id,{host_id:host.id,course_id:course.id}); return c.json({id,title,status:"scheduled"},201);
});

academyRoutes.post("/institutions/:code/cci/live-classes/:id/participants/", async (c) => {
  const auth=await requireUser(c); if(!auth.ok)return respond(c,auth.response); const ctx=await cciContext(c, c.req.param("code"),auth.user); if(!canManageCCIProgram(ctx,auth.user)||!UUID_RE.test(c.req.param("id")))return respond(c,forbidden("CCI management or administration permission is required."));
  const body=(await c.req.json().catch(()=>({}))) as Record<string,unknown>; const userId=String(body.user_id??""); const role=String(body.role??"student"); if(!UUID_RE.test(userId)||!["student","teacher","mentor"].includes(role))return respond(c,detail("Choose an active participant role."));
  const live=await one<{id:string}>(`select id from academy_liveclass where id=$1 and institution_id=$2`,[c.req.param("id"),ctx!.institution.id]); const member=await one<{id:string}>(`select id from academy_academymembership where institution_id=$1 and user_id=$2 and is_active=true`,[ctx!.institution.id,userId]); if(!live||!member)return respond(c,notFound());
  await query(`insert into academy_cciliveclassparticipant (id,live_class_id,user_id,role,created_at) values ($1,$2,$3,$4,now()) on conflict (live_class_id,user_id) do update set role=excluded.role`,[uuid(),live.id,userId,role]); await cciAudit(ctx!.institution.id,auth.user.id,"cci.live_class.participant_assigned","live_class",live.id,{user_id:userId,role}); return c.json({live_class_id:live.id,user_id:userId,role},201);
});

academyRoutes.patch("/institutions/:code/cci/live-classes/:id/", async (c) => {
  const auth=await requireUser(c); if(!auth.ok)return respond(c,auth.response); const ctx=await cciContext(c, c.req.param("code"),auth.user); const id=c.req.param("id"); if(!ctx||!UUID_RE.test(id))return respond(c,notFound());
  const live=await one<{id:string;host_id:string|null}>(`select id,host_id from academy_liveclass where id=$1 and institution_id=$2`,[id,ctx.institution.id]); if(!live)return respond(c,notFound());
  if(!canManageCCIProgram(ctx,auth.user)&&live.host_id!==auth.user.id)return respond(c,forbidden("Only CCI management, administration, or the assigned host can control this class."));
  const status=String(((await c.req.json().catch(()=>({}))) as Record<string,unknown>).status??""); if(!["scheduled","live","ended"].includes(status))return respond(c,fieldError({status:["Choose scheduled, live, or ended."]}));
  await query(`update academy_liveclass set status=$1 where id=$2`,[status,id]); await cciAudit(ctx.institution.id,auth.user.id,`cci.live_class.${status}`,"live_class",id); return c.json({id,status});
});

academyRoutes.post("/institutions/:code/cci/members/:userId/roles/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  const roleManager = ctx && (auth.user.is_superuser || ctx.roles.some((role) => CCI_ROLE_MANAGERS.has(role)));
  if (!roleManager) return respond(c, forbidden("CCI role-assignment permission is required."));
  const userId = c.req.param("userId");
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const role = String(body.role ?? "");
  if (!UUID_RE.test(userId) || !CCI_ROLES.has(role)) return respond(c, fieldError({ role: ["Enter a valid CCI role." ] }));
  if (role === "founder" && !auth.user.is_superuser && !ctx!.roles.includes("founder")) {
    return respond(c, forbidden("Only a Founder or Platform/System Administrator can assign the Founder role."));
  }
  const member = await one<{ id: string }>(
    `select id from academy_academymembership where institution_id = $1 and user_id = $2 and is_active = true`,
    [ctx!.institution.id, userId],
  );
  if (!member) return respond(c, fieldError({ user_id: ["User must be an active CCI member."] }));
  const existing = await one<{ id: string }>(
    `select id from academy_cciroleassignment where institution_id = $1 and user_id = $2 and role = $3`,
    [ctx!.institution.id, userId, role],
  );
  if (existing) {
    await query(`update academy_cciroleassignment set is_active = true, assigned_by_id = $1 where id = $2`, [auth.user.id, existing.id]);
  } else {
    await query(`insert into academy_cciroleassignment (id, institution_id, user_id, role, is_active, assigned_by_id, assigned_at) values ($1,$2,$3,$4,true,$5,now())`, [uuid(), ctx!.institution.id, userId, role, auth.user.id]);
  }
  await cciAudit(ctx!.institution.id, auth.user.id, "cci.role.assigned", "user", userId, { role });
  return c.json({ user_id: userId, role, is_active: true }, existing ? 200 : 201);
});

academyRoutes.delete("/institutions/:code/cci/members/:userId/roles/:role/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  const roleManager = ctx && (auth.user.is_superuser || ctx.roles.some((role) => CCI_ROLE_MANAGERS.has(role)));
  const userId = c.req.param("userId"); const role = c.req.param("role");
  if (!roleManager) return respond(c, forbidden("CCI role-assignment permission is required."));
  if (!UUID_RE.test(userId) || !CCI_ROLES.has(role)) return respond(c, notFound());
  if (role === "founder" && !auth.user.is_superuser && !ctx!.roles.includes("founder")) {
    return respond(c, forbidden("Only a Founder or Platform/System Administrator can revoke the Founder role."));
  }
  const assignment = await one<{ id: string }>(`select id from academy_cciroleassignment where institution_id = $1 and user_id = $2 and role = $3 and is_active = true`, [ctx!.institution.id, userId, role]);
  if (!assignment) return respond(c, notFound());
  await query(`update academy_cciroleassignment set is_active = false where id = $1`, [assignment.id]);
  await cciAudit(ctx!.institution.id, auth.user.id, "cci.role.revoked", "user", userId, { role });
  return c.json({ user_id: userId, role, is_active: false });
});

type CCIResourceRow = {
  id: string; title: string; description: string; category: string; access_level: string; status: string;
  created_by: string; review_note: string; created_at: Date; updated_at: Date;
};

function serializeCCIResource(row: CCIResourceRow, canReview: boolean, storageEnabled: boolean) {
  return {
    id: row.id, title: row.title, description: row.description, category: row.category,
    access_level: row.access_level, status: row.status, created_by: row.created_by,
    review_note: canReview ? row.review_note : undefined,
    file_status: storageEnabled ? "not_uploaded" : "storage_not_configured",
    created_at: iso(row.created_at), updated_at: iso(row.updated_at),
  };
}

function cciStorageEnabled(): boolean {
  return process.env.CCI_STORAGE_ENABLED === "true" && Boolean(process.env.CCI_STORAGE_BUCKET);
}

academyRoutes.get("/institutions/:code/cci/resources/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const canReview = auth.user.is_superuser || ctx.roles.some((role) => CCI_RESOURCE_REVIEWERS.has(role));
  const rows = await query<CCIResourceRow>(
    canReview
      ? `select id, title, description, category, access_level, status, created_by_id as created_by, review_note, created_at, updated_at from academy_cciresource where institution_id = $1 order by updated_at desc`
      : `select id, title, description, category, access_level, status, created_by_id as created_by, review_note, created_at, updated_at from academy_cciresource where institution_id = $1 and status = 'approved' and (access_level = 'participants' or $2 = true) order by updated_at desc`,
    canReview ? [ctx.institution.id] : [ctx.institution.id, ctx.isStaff],
  );
  const resourceIds = rows.map((row) => row.id);
  const files = resourceIds.length ? await query<{ id: string; owner_id: string; file_name: string; content_type: string; file_size: number }>(`select id, owner_id, file_name, content_type, file_size from academy_fileattachment where owner_type = 'cci_resource' and owner_id = any($1::uuid[])`, [resourceIds]) : [];
  return c.json({ storage_enabled: true, can_manage: ctx.canManage, can_review: canReview, resources: rows.map((row) => ({ ...serializeCCIResource(row, canReview, true), attachments: files.filter((file) => file.owner_id === row.id).map((file) => ({ ...file, download_url: `/academy/attachments/${file.id}/download/` })) })) });
});

academyRoutes.post("/institutions/:code/cci/resources/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !ctx.canManage) return respond(c, forbidden("CCI resource-management permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim(); const category = String(body.category ?? "general").trim() || "general";
  const accessLevel = String(body.access_level ?? "participants");
  if (!title || title.length > 200 || category.length > 80 || !["staff", "participants"].includes(accessLevel)) return respond(c, detail("Enter a valid title, category, and access level."));
  const id = uuid();
  await query(`insert into academy_cciresource (id, institution_id, title, description, category, access_level, status, storage_key, created_by_id, review_note, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,'draft','',$7,'',now(),now())`, [id, ctx.institution.id, title, String(body.description ?? "").trim(), category, accessLevel, auth.user.id]);
  try {
    const attachments = await saveAttachments(ctx.institution.id, "cci_resource", id, auth.user.id, body.attachments);
    await cciAudit(ctx.institution.id, auth.user.id, "cci.resource.created", "resource", id);
    return c.json({ id, title, category, access_level: accessLevel, status: "draft", attachments }, 201);
  } catch (error) {
    await query(`delete from academy_cciresource where id = $1`, [id]);
    return respond(c, detail(error instanceof Error ? error.message : "Unable to save attachments."));
  }
});

academyRoutes.post("/institutions/:code/cci/resources/:id/submit/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const id = c.req.param("id");
  if (!ctx || !UUID_RE.test(id)) return respond(c, notFound());
  const resource = await one<{ id: string; created_by_id: string; status: string }>(`select id, created_by_id, status from academy_cciresource where id = $1 and institution_id = $2`, [id, ctx.institution.id]);
  if (!resource) return respond(c, notFound());
  if (!ctx.canManage && resource.created_by_id !== auth.user.id) return respond(c, forbidden("Only the resource creator or a CCI manager can submit it."));
  if (!["draft", "rejected"].includes(resource.status)) return respond(c, detail("Only draft or rejected resources can be submitted."));
  await query(`update academy_cciresource set status = 'pending_review', updated_at = now() where id = $1`, [id]);
  await cciAudit(ctx.institution.id, auth.user.id, "cci.resource.submitted", "resource", id);
  return c.json({ id, status: "pending_review" });
});

academyRoutes.post("/institutions/:code/cci/resources/:id/review/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const id = c.req.param("id");
  const canReview = ctx && (auth.user.is_superuser || ctx.roles.some((role) => CCI_RESOURCE_REVIEWERS.has(role)));
  if (!canReview || !UUID_RE.test(id)) return respond(c, forbidden("CCI resource-review permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const status = String(body.status ?? "");
  if (!["approved", "rejected"].includes(status)) return respond(c, fieldError({ status: ["Choose approved or rejected."] }));
  const resource = await one<{ id: string; status: string }>(`select id, status from academy_cciresource where id = $1 and institution_id = $2`, [id, ctx!.institution.id]);
  if (!resource) return respond(c, notFound());
  if (resource.status !== "pending_review") return respond(c, detail("Only pending resources can be reviewed."));
  const note = String(body.review_note ?? "").trim();
  await query(`update academy_cciresource set status = $1, review_note = $2, reviewed_by_id = $3, reviewed_at = now(), updated_at = now() where id = $4`, [status, note, auth.user.id, id]);
  await cciAudit(ctx!.institution.id, auth.user.id, `cci.resource.${status}`, "resource", id);
  return c.json({ id, status, file_status: cciStorageEnabled() ? "not_uploaded" : "storage_not_configured" });
});

type CCIEventRow = { id: string; title: string; description: string; audience: string; starts_at: Date; ends_at: Date | null; location: string; status: string; created_at: Date };
function serializeCCIEvent(row: CCIEventRow) { return { ...row, starts_at: iso(row.starts_at), ends_at: iso(row.ends_at), created_at: iso(row.created_at) }; }

academyRoutes.get("/institutions/:code/cci/events/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const rows = await query<CCIEventRow>(
    `select id, title, description, audience, starts_at, ends_at, location, status, created_at from academy_ccievent
      where institution_id = $1 and status = 'scheduled' and (audience = 'all' or audience = $2)
      order by starts_at asc limit 100`, [ctx.institution.id, ctx.isStaff ? "staff" : "students"],
  );
  return c.json({ events: rows.map(serializeCCIEvent), reminders: "not_configured", external_calendar: "not_configured" });
});

academyRoutes.post("/institutions/:code/cci/events/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !ctx.canManage) return respond(c, forbidden("CCI event-management permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim(); const startsAt = new Date(String(body.starts_at ?? ""));
  const endsAt = body.ends_at ? new Date(String(body.ends_at)) : null; const audience = String(body.audience ?? "all");
  if (!title || title.length > 200 || Number.isNaN(startsAt.getTime()) || (endsAt && Number.isNaN(endsAt.getTime())) || (endsAt && endsAt < startsAt) || !["all", "staff", "students"].includes(audience)) return respond(c, detail("Enter a valid title, schedule, and audience."));
  const id = uuid();
  await query(`insert into academy_ccievent (id, institution_id, title, description, audience, starts_at, ends_at, location, status, created_by_id, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,'scheduled',$9,now(),now())`, [id, ctx.institution.id, title, String(body.description ?? "").trim(), audience, startsAt, endsAt, String(body.location ?? "").trim(), auth.user.id]);
  await cciAudit(ctx.institution.id, auth.user.id, "cci.event.created", "event", id, { audience });
  return c.json({ id, title, audience, starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null, status: "scheduled" }, 201);
});

academyRoutes.patch("/institutions/:code/cci/events/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const id = c.req.param("id");
  if (!ctx || !ctx.canManage || !UUID_RE.test(id)) return respond(c, forbidden("CCI event-management permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const status = String(body.status ?? "");
  if (!["scheduled", "cancelled", "completed"].includes(status)) return respond(c, fieldError({ status: ["Enter a valid event status."] }));
  const event = await one<{ id: string }>(`select id from academy_ccievent where id = $1 and institution_id = $2`, [id, ctx.institution.id]);
  if (!event) return respond(c, notFound());
  await query(`update academy_ccievent set status = $1, updated_at = now() where id = $2`, [status, id]);
  await cciAudit(ctx.institution.id, auth.user.id, `cci.event.${status}`, "event", id);
  return c.json({ id, status });
});

type AdmissionRow = { id: string; applicant_id: string; status: string; fields: Record<string, unknown>; reviewer_note: string; submitted_at: Date | null; created_at: Date; updated_at: Date; email?: string; display_name?: string };
function serializeAdmission(row: AdmissionRow, includeReview = false) { return { id: row.id, applicant_id: row.applicant_id, applicant: includeReview ? { email: row.email, display_name: row.display_name } : undefined, status: row.status, fields: row.fields, reviewer_note: includeReview ? row.reviewer_note : undefined, submitted_at: iso(row.submitted_at), created_at: iso(row.created_at), updated_at: iso(row.updated_at) }; }
async function cciInstitution(code: string) { return one<InstitutionRow>(`select ${INSTITUTION_COLUMNS} from academy_institution where code = $1 and is_active = true`, [code]); }

academyRoutes.get("/institutions/:code/cci/admissions/me/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const institution = await cciInstitution(c.req.param("code")); if (!institution) return respond(c, notFound());
  const row = await one<AdmissionRow>(`select id, applicant_id, status, fields, reviewer_note, submitted_at, created_at, updated_at from academy_cciadmissionapplication where institution_id = $1 and applicant_id = $2`, [institution.id, auth.user.id]);
  return c.json(row ? serializeAdmission(row) : null);
});

academyRoutes.put("/institutions/:code/cci/admissions/me/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const institution = await cciInstitution(c.req.param("code")); if (!institution) return respond(c, notFound());
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const fields = body.fields && typeof body.fields === "object" && !Array.isArray(body.fields) ? body.fields : null;
  if (!fields) return respond(c, fieldError({ fields: ["Enter configurable application fields as an object."] }));
  const existing = await one<AdmissionRow>(`select id, applicant_id, status, fields, reviewer_note, submitted_at, created_at, updated_at from academy_cciadmissionapplication where institution_id = $1 and applicant_id = $2`, [institution.id, auth.user.id]);
  if (existing && !["draft", "rejected"].includes(existing.status)) return respond(c, detail("This application can no longer be edited."));
  const id = existing?.id ?? uuid();
  if (existing) await query(`update academy_cciadmissionapplication set fields = $1::jsonb, status = 'draft', updated_at = now() where id = $2`, [JSON.stringify(fields), id]);
  else await query(`insert into academy_cciadmissionapplication (id, institution_id, applicant_id, status, fields, reviewer_note, created_at, updated_at) values ($1,$2,$3,'draft',$4::jsonb,'',now(),now())`, [id, institution.id, auth.user.id, JSON.stringify(fields)]);
  await cciAudit(institution.id, auth.user.id, "cci.admission.saved", "admission", id);
  return c.json({ id, status: "draft", fields });
});

academyRoutes.post("/institutions/:code/cci/admissions/me/submit/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const institution = await cciInstitution(c.req.param("code")); if (!institution) return respond(c, notFound());
  const row = await one<AdmissionRow>(`select id, applicant_id, status, fields, reviewer_note, submitted_at, created_at, updated_at from academy_cciadmissionapplication where institution_id = $1 and applicant_id = $2`, [institution.id, auth.user.id]);
  if (!row || !["draft", "rejected"].includes(row.status)) return respond(c, detail("A draft or returned application is required."));
  await query(`update academy_cciadmissionapplication set status = 'submitted', submitted_at = now(), updated_at = now() where id = $1`, [row.id]);
  await cciAudit(institution.id, auth.user.id, "cci.admission.submitted", "admission", row.id);
  return c.json({ id: row.id, status: "submitted" });
});

academyRoutes.get("/institutions/:code/cci/admissions/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !(auth.user.is_superuser || ctx.roles.some((role) => CCI_ADMISSIONS_STAFF.has(role)))) return respond(c, forbidden("CCI admissions permission is required."));
  const rows = await query<AdmissionRow>(`select a.id, a.applicant_id, a.status, a.fields, a.reviewer_note, a.submitted_at, a.created_at, a.updated_at, u.email, u.display_name from academy_cciadmissionapplication a join users_user u on u.id = a.applicant_id where a.institution_id = $1 order by a.updated_at desc`, [ctx.institution.id]);
  return c.json(rows.map((row) => serializeAdmission(row, true)));
});

academyRoutes.post("/institutions/:code/cci/admissions/:id/review/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const id = c.req.param("id");
  if (!ctx || !(auth.user.is_superuser || ctx.roles.some((role) => CCI_ADMISSIONS_STAFF.has(role))) || !UUID_RE.test(id)) return respond(c, forbidden("CCI admissions permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const status = String(body.status ?? "");
  if (!["under_review", "accepted", "rejected"].includes(status)) return respond(c, fieldError({ status: ["Choose a valid review status."] }));
  const row = await one<{ id: string }>(`select id from academy_cciadmissionapplication where id = $1 and institution_id = $2 and status in ('submitted', 'under_review')`, [id, ctx.institution.id]);
  if (!row) return respond(c, notFound("Submitted application not found."));
  const note = String(body.reviewer_note ?? "").trim();
  await query(`update academy_cciadmissionapplication set status = $1, reviewer_note = $2, reviewed_by_id = $3, reviewed_at = now(), updated_at = now() where id = $4`, [status, note, auth.user.id, id]);
  await cciAudit(ctx.institution.id, auth.user.id, `cci.admission.${status}`, "admission", id);
  return c.json({ id, status });
});

const CCI_FORMATION_STAFF = new Set(["administrator", "advisor"]);
type FormationRow = { id: string; student_id: string; summary: string; visibility: string; created_at: Date };
type AttendanceRow = { id: string; student_id: string; event_id: string | null; status: string; note: string; recorded_at: Date };

academyRoutes.get("/institutions/:code/cci/formation/me/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const notes = await query<FormationRow>(`select id, student_id, summary, visibility, created_at from academy_cciformationnote where institution_id = $1 and student_id = $2 and visibility = 'student' order by created_at desc`, [ctx.institution.id, auth.user.id]);
  const attendance = await query<AttendanceRow>(`select id, student_id, event_id, status, note, recorded_at from academy_cciattendancerecord where institution_id = $1 and student_id = $2 order by recorded_at desc`, [ctx.institution.id, auth.user.id]);
  return c.json({ formation_notes: notes.map((n) => ({ ...n, created_at: iso(n.created_at) })), attendance: attendance.map((r) => ({ ...r, recorded_at: iso(r.recorded_at) })) });
});

academyRoutes.post("/institutions/:code/cci/students/:studentId/formation/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const studentId = c.req.param("studentId");
  if (!ctx || !(auth.user.is_superuser || ctx.roles.some((role) => CCI_FORMATION_STAFF.has(role))) || !UUID_RE.test(studentId)) return respond(c, forbidden("CCI formation permission is required."));
  const member = await one<{ id: string }>(`select id from academy_academymembership where institution_id = $1 and user_id = $2 and is_active = true`, [ctx.institution.id, studentId]);
  if (!member) return respond(c, notFound("CCI student not found."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const summary = String(body.summary ?? "").trim(); const visibility = String(body.visibility ?? "staff");
  if (!summary || !["staff", "student"].includes(visibility)) return respond(c, detail("A formation note and valid visibility are required."));
  const id = uuid(); await query(`insert into academy_cciformationnote (id, institution_id, student_id, author_id, summary, visibility, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,now(),now())`, [id, ctx.institution.id, studentId, auth.user.id, summary, visibility]);
  await cciAudit(ctx.institution.id, auth.user.id, "cci.formation_note.created", "formation_note", id, { student_id: studentId, visibility });
  return c.json({ id, student_id: studentId, visibility }, 201);
});

academyRoutes.post("/institutions/:code/cci/students/:studentId/attendance/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const studentId = c.req.param("studentId");
  if (!ctx || !(auth.user.is_superuser || ctx.roles.some((role) => CCI_FORMATION_STAFF.has(role))) || !UUID_RE.test(studentId)) return respond(c, forbidden("CCI attendance permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const status = String(body.status ?? ""); const eventId = body.event_id ? String(body.event_id) : null;
  if (!["present", "late", "absent", "excused"].includes(status) || (eventId && !UUID_RE.test(eventId))) return respond(c, detail("A valid attendance status and optional event are required."));
  const id = uuid(); await query(`insert into academy_cciattendancerecord (id, institution_id, student_id, event_id, status, note, recorded_by_id, recorded_at) values ($1,$2,$3,$4,$5,$6,$7,now()) on conflict (institution_id, student_id, event_id) do update set status = excluded.status, note = excluded.note, recorded_by_id = excluded.recorded_by_id, recorded_at = now()`, [id, ctx.institution.id, studentId, eventId, status, String(body.note ?? "").trim(), auth.user.id]);
  await cciAudit(ctx.institution.id, auth.user.id, "cci.attendance.recorded", "attendance", id, { student_id: studentId, status, event_id: eventId });
  return c.json({ student_id: studentId, status });
});

async function canViewCCIStudent(ctx: CCIContext, userId: string, studentId: string, isSuperuser: boolean): Promise<boolean> {
  if (isSuperuser || ctx.roles.includes("administrator")) return true;
  if (!ctx.roles.includes("advisor")) return false;
  const assignment = await one<{ id: string }>(`select id from academy_mentorassignment where institution_id = $1 and mentor_id = $2 and student_id = $3`, [ctx.institution.id, userId, studentId]);
  return Boolean(assignment);
}

academyRoutes.get("/institutions/:code/cci/students/:studentId/records/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const studentId = c.req.param("studentId");
  if (!ctx || !UUID_RE.test(studentId)) return respond(c, notFound());
  if (!(await canViewCCIStudent(ctx, auth.user.id, studentId, auth.user.is_superuser))) return respond(c, forbidden("You do not have permission to view this student record."));
  const student = await one<{ id: string; email: string; display_name: string; first_name: string; last_name: string }>(`select u.id, u.email, u.display_name, u.first_name, u.last_name from users_user u join academy_academymembership m on m.user_id = u.id where u.id = $1 and m.institution_id = $2 and m.is_active = true`, [studentId, ctx.institution.id]);
  if (!student) return respond(c, notFound("CCI student not found."));
  const notes = await query<FormationRow>(`select id, student_id, summary, visibility, created_at from academy_cciformationnote where institution_id = $1 and student_id = $2 order by created_at desc`, [ctx.institution.id, studentId]);
  const attendance = await query<AttendanceRow>(`select id, student_id, event_id, status, note, recorded_at from academy_cciattendancerecord where institution_id = $1 and student_id = $2 order by recorded_at desc`, [ctx.institution.id, studentId]);
  return c.json({ student: { id: student.id, name: student.display_name || `${student.first_name} ${student.last_name}`.trim() || student.email, email: student.email }, formation_notes: notes.map((n) => ({ ...n, created_at: iso(n.created_at) })), attendance: attendance.map((r) => ({ ...r, recorded_at: iso(r.recorded_at) })) });
});

// Advisors receive only their explicitly assigned mentees. Administrators may
// view the program list; no confidential formation notes are returned here.
academyRoutes.get("/institutions/:code/cci/mentees/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !(auth.user.is_superuser || ctx.roles.includes("administrator") || ctx.roles.includes("advisor"))) return respond(c, forbidden("CCI advisor access is required."));
  const rows = await query<{ id: string; display_name: string; first_name: string; last_name: string; email: string; notes: string; rating: string }>(
    `select u.id, u.display_name, u.first_name, u.last_name, u.email, ma.notes, ma.rating
       from academy_mentorassignment ma join users_user u on u.id = ma.student_id
      where ma.institution_id = $1 ${auth.user.is_superuser || ctx.roles.includes("administrator") ? "" : "and ma.mentor_id = $2"}
      order by u.display_name, u.email`,
    auth.user.is_superuser || ctx.roles.includes("administrator") ? [ctx.institution.id] : [ctx.institution.id, auth.user.id],
  );
  return c.json(rows.map((row) => ({ id: row.id, name: row.display_name || `${row.first_name} ${row.last_name}`.trim() || row.email, email: row.email, notes: row.notes, rating: num(row.rating) })));
});

const CCI_GRADERS = new Set(["administrator", "teacher"]);
type GradeRow = { submission_id: string; student_id: string; assignment_id: string; assignment_title: string; max_marks: number; status: string; score: number | null; submitted_at: Date | null; notes: string };

academyRoutes.get("/institutions/:code/cci/gradebook/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !(auth.user.is_superuser || ctx.roles.some((role) => CCI_GRADERS.has(role)))) return respond(c, forbidden("CCI grading permission is required."));
  const rows = await query<GradeRow>(`select s.id as submission_id, s.user_id as student_id, a.id as assignment_id, a.title as assignment_title, a.max_marks, s.status, s.score, s.submitted_at, s.notes from academy_assignmentsubmission s join academy_assignment a on a.id = s.assignment_id where a.institution_id = $1 and s.status in ('submitted', 'graded') ${auth.user.is_superuser || ctx.roles.includes("administrator") ? "" : "and exists (select 1 from academy_ccicourseassignment ca where ca.course_id = a.course_id and ca.user_id = $2 and ca.role = 'teacher')"} order by s.submitted_at desc`, auth.user.is_superuser || ctx.roles.includes("administrator") ? [ctx.institution.id] : [ctx.institution.id, auth.user.id]);
  return c.json(rows.map((r) => ({ ...r, submitted_at: iso(r.submitted_at) })));
});

academyRoutes.get("/institutions/:code/cci/grades/me/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const rows = await query<GradeRow>(`select s.id as submission_id, s.user_id as student_id, a.id as assignment_id, a.title as assignment_title, a.max_marks, s.status, s.score, s.submitted_at, s.notes from academy_assignmentsubmission s join academy_assignment a on a.id = s.assignment_id where a.institution_id = $1 and s.user_id = $2 and s.status = 'graded' order by s.submitted_at desc`, [ctx.institution.id, auth.user.id]);
  return c.json(rows.map((r) => ({ ...r, submitted_at: iso(r.submitted_at) })));
});

academyRoutes.post("/institutions/:code/cci/submissions/:id/grade/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const id = c.req.param("id");
  if (!ctx || !(auth.user.is_superuser || ctx.roles.some((role) => CCI_GRADERS.has(role))) || !UUID_RE.test(id)) return respond(c, forbidden("CCI grading permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const score = Number(body.score);
  if (!Number.isInteger(score) || score < 0) return respond(c, fieldError({ score: ["Enter a non-negative whole-number score."] }));
  const row = await one<{ id: string; score: number | null; max_marks: number }>(`select s.id, s.score, a.max_marks from academy_assignmentsubmission s join academy_assignment a on a.id = s.assignment_id where s.id = $1 and a.institution_id = $2 and s.status in ('submitted', 'graded') ${auth.user.is_superuser || ctx.roles.includes("administrator") ? "" : "and exists (select 1 from academy_ccicourseassignment ca where ca.course_id = a.course_id and ca.user_id = $3 and ca.role = 'teacher')"}`, auth.user.is_superuser || ctx.roles.includes("administrator") ? [id, ctx.institution.id] : [id, ctx.institution.id, auth.user.id]);
  if (!row) return respond(c, notFound("Submitted assignment not found."));
  if (score > row.max_marks) return respond(c, fieldError({ score: [`Score cannot exceed ${row.max_marks}.`] }));
  const reason = String(body.reason ?? "").trim();
  await query(`update academy_assignmentsubmission set score = $1, status = 'graded' where id = $2`, [score, id]);
  await query(`insert into academy_ccigradechange (id, submission_id, previous_score, new_score, reason, changed_by_id, created_at) values ($1,$2,$3,$4,$5,$6,now())`, [uuid(), id, row.score, score, reason, auth.user.id]);
  await cciAudit(ctx.institution.id, auth.user.id, "cci.grade.changed", "submission", id, { previous_score: row.score, new_score: score });
  return c.json({ id, score, status: "graded" });
});

const CCI_REPORT_VIEWERS = new Set(["administrator"]);
academyRoutes.get("/institutions/:code/cci/reports/overview/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !(auth.user.is_superuser || ctx.roles.some((role) => CCI_REPORT_VIEWERS.has(role)))) return respond(c, forbidden("CCI reporting permission is required."));
  const [members, tasks, admissions, attendance, grades] = await Promise.all([
    count(`select count(*) as n from academy_academymembership where institution_id = $1 and is_active = true`, [ctx.institution.id]),
    query<{ status: string; n: number }>(`select status, count(*)::int as n from academy_ccitask where institution_id = $1 group by status`, [ctx.institution.id]),
    query<{ status: string; n: number }>(`select status, count(*)::int as n from academy_cciadmissionapplication where institution_id = $1 group by status`, [ctx.institution.id]),
    query<{ status: string; n: number }>(`select status, count(*)::int as n from academy_cciattendancerecord where institution_id = $1 group by status`, [ctx.institution.id]),
    query<{ submitted: number; graded: number }>(`select count(*) filter (where s.status = 'submitted')::int as submitted, count(*) filter (where s.status = 'graded')::int as graded from academy_assignmentsubmission s join academy_assignment a on a.id = s.assignment_id where a.institution_id = $1`, [ctx.institution.id]),
  ]);
  const toMap = (rows: Array<{ status: string; n: number }>) => Object.fromEntries(rows.map((r) => [r.status, num(r.n)]));
  return c.json({ generated_at: new Date().toISOString(), active_members: members, tasks: toMap(tasks), admissions: toMap(admissions), attendance: toMap(attendance), assessments: { submitted: num(grades[0]?.submitted), graded: num(grades[0]?.graded) } });
});

academyRoutes.get("/institutions/:code/cci/staff-connect/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !ctx.isStaff) return respond(c, forbidden("Active CCI staff membership is required."));
  const rows = await query<{ id: string; body: string; created_at: Date; display_name: string; first_name: string; last_name: string; email: string }>(`select p.id, p.body, p.created_at, u.display_name, u.first_name, u.last_name, u.email from academy_ccistaffpost p join users_user u on u.id = p.author_id where p.institution_id = $1 and p.is_archived = false order by p.created_at desc limit 100`, [ctx.institution.id]);
  return c.json(rows.map((r) => ({ id: r.id, body: r.body, author: r.display_name || `${r.first_name} ${r.last_name}`.trim() || r.email, created_at: iso(r.created_at) })));
});

academyRoutes.post("/institutions/:code/cci/staff-connect/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user);
  if (!ctx || !ctx.isStaff) return respond(c, forbidden("Active CCI staff membership is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const message = String(body.body ?? "").trim();
  if (!message || message.length > 5000) return respond(c, fieldError({ body: ["Enter a message of 5,000 characters or fewer."] }));
  const id = uuid(); await query(`insert into academy_ccistaffpost (id, institution_id, author_id, body, is_archived, created_at, updated_at) values ($1,$2,$3,$4,false,now(),now())`, [id, ctx.institution.id, auth.user.id, message]);
  await cciAudit(ctx.institution.id, auth.user.id, "cci.staff_post.created", "staff_post", id);
  return c.json({ id, body: message }, 201);
});

const CCI_MODERATORS = new Set(["administrator"]);
academyRoutes.get("/institutions/:code/cci/bonding/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const moderator = auth.user.is_superuser || ctx.roles.some((role) => CCI_MODERATORS.has(role));
  const rows = await query<{ id: string; body: string; status: string; author_id: string; created_at: Date; display_name: string; email: string }>(moderator ? `select p.id, p.body, p.status, p.author_id, p.created_at, u.display_name, u.email from academy_ccibondingpost p join users_user u on u.id = p.author_id where p.institution_id = $1 order by p.created_at desc` : `select p.id, p.body, p.status, p.author_id, p.created_at, u.display_name, u.email from academy_ccibondingpost p join users_user u on u.id = p.author_id where p.institution_id = $1 and (p.status = 'approved' or p.author_id = $2) order by p.created_at desc`, moderator ? [ctx.institution.id] : [ctx.institution.id, auth.user.id]);
  return c.json({ can_moderate: moderator, posts: rows.map((r) => ({ id: r.id, body: r.body, status: r.status, is_mine: r.author_id === auth.user.id, author: r.display_name || r.email, created_at: iso(r.created_at) })) });
});

academyRoutes.post("/institutions/:code/cci/bonding/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const message = String(body.body ?? "").trim();
  if (!message || message.length > 3000) return respond(c, fieldError({ body: ["Enter a post of 3,000 characters or fewer."] }));
  const id = uuid(); await query(`insert into academy_ccibondingpost (id, institution_id, author_id, body, status, moderation_note, created_at) values ($1,$2,$3,$4,'pending','',now())`, [id, ctx.institution.id, auth.user.id, message]);
  await cciAudit(ctx.institution.id, auth.user.id, "cci.bonding_post.submitted", "bonding_post", id);
  return c.json({ id, status: "pending" }, 201);
});

academyRoutes.post("/institutions/:code/cci/bonding/:id/moderate/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); const id = c.req.param("id");
  if (!ctx || !(auth.user.is_superuser || ctx.roles.some((role) => CCI_MODERATORS.has(role))) || !UUID_RE.test(id)) return respond(c, forbidden("CCI moderation permission is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const status = String(body.status ?? "");
  if (!["approved", "rejected"].includes(status)) return respond(c, fieldError({ status: ["Choose approved or rejected."] }));
  const post = await one<{ id: string }>(`select id from academy_ccibondingpost where id = $1 and institution_id = $2 and status = 'pending'`, [id, ctx.institution.id]); if (!post) return respond(c, notFound("Pending post not found."));
  await query(`update academy_ccibondingpost set status = $1, moderation_note = $2, moderated_by_id = $3, moderated_at = now() where id = $4`, [status, String(body.note ?? "").trim(), auth.user.id, id]);
  await cciAudit(ctx.institution.id, auth.user.id, `cci.bonding_post.${status}`, "bonding_post", id);
  return c.json({ id, status });
});

type SupportRequestRow = { id: string; requester_id: string; subject: string; category: string; description: string; status: string; course_id: string | null; created_at: Date; updated_at: Date; requester_name?: string; requester_email?: string };
function serializeSupportRequest(row: SupportRequestRow, includeRequester: boolean) { return { id: row.id, subject: row.subject, category: row.category, description: row.description, status: row.status, course_id: row.course_id, created_at: iso(row.created_at), updated_at: iso(row.updated_at), requester: includeRequester ? { id: row.requester_id, name: row.requester_name, email: row.requester_email } : undefined }; }
function canManageSupport(ctx: CCIContext, user: { is_superuser: boolean }) { return user.is_superuser || ctx.roles.includes("administrator"); }

academyRoutes.get("/institutions/:code/cci/support/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const manager = canManageSupport(ctx, auth.user);
  const rows = await query<SupportRequestRow>(manager ? `select r.id, r.requester_id, r.subject, r.category, r.description, r.status, r.course_id, r.created_at, r.updated_at, u.display_name as requester_name, u.email as requester_email from academy_ccisupportrequest r join users_user u on u.id=r.requester_id where r.institution_id=$1 order by r.updated_at desc` : `select id, requester_id, subject, category, description, status, course_id, created_at, updated_at from academy_ccisupportrequest where institution_id=$1 and requester_id=$2 order by updated_at desc`, manager ? [ctx.institution.id] : [ctx.institution.id, auth.user.id]);
  return c.json({ can_manage: manager, requests: rows.map((row) => serializeSupportRequest(row, manager)) });
});

academyRoutes.post("/institutions/:code/cci/support/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response);
  const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!ctx) return respond(c, forbidden("Active CCI membership is required."));
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const subject = String(body.subject ?? "").trim(); const category = String(body.category ?? "general").trim(); const description = String(body.description ?? "").trim(); const courseId = body.course_id ? String(body.course_id) : null;
  if (!subject || subject.length > 200 || !description || description.length > 5000 || category.length > 80 || (courseId && !UUID_RE.test(courseId))) return respond(c, detail("Enter a valid subject, category, description, and optional course."));
  if (courseId && !await one<{ id: string }>(`select id from academy_course where id=$1 and institution_id=$2`, [courseId, ctx.institution.id])) return respond(c, fieldError({ course_id: ["Choose a CCI course."] }));
  const id = uuid(); await query(`insert into academy_ccisupportrequest (id,institution_id,requester_id,course_id,subject,category,description,status,created_at,updated_at) values ($1,$2,$3,$4,$5,$6,$7,'open',now(),now())`, [id, ctx.institution.id, auth.user.id, courseId, subject, category, description]);
  try { const attachments = await saveAttachments(ctx.institution.id, "cci_support", id, auth.user.id, body.attachments); await cciAudit(ctx.institution.id, auth.user.id, "cci.support.created", "support_request", id); return c.json({ id, subject, status: "open", attachments }, 201); } catch (error) { await query(`delete from academy_ccisupportrequest where id=$1`, [id]); return respond(c, detail(error instanceof Error ? error.message : "Unable to save attachment.")); }
});

academyRoutes.get("/institutions/:code/cci/support/:id/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response); const id = c.req.param("id"); const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!ctx || !UUID_RE.test(id)) return respond(c, notFound()); const manager = canManageSupport(ctx, auth.user);
  const request = await one<SupportRequestRow>(`select r.id,r.requester_id,r.subject,r.category,r.description,r.status,r.course_id,r.created_at,r.updated_at,u.display_name as requester_name,u.email as requester_email from academy_ccisupportrequest r join users_user u on u.id=r.requester_id where r.id=$1 and r.institution_id=$2`, [id, ctx.institution.id]);
  if (!request || (!manager && request.requester_id !== auth.user.id)) return respond(c, notFound());
  const replies = await query<{ id: string; body: string; created_at: Date; author_id: string; display_name: string; email: string }>(`select p.id,p.body,p.created_at,p.author_id,u.display_name,u.email from academy_ccisupportreply p join users_user u on u.id=p.author_id where p.request_id=$1 order by p.created_at`, [id]);
  return c.json({ ...serializeSupportRequest(request, manager), replies: replies.map((reply) => ({ id: reply.id, body: reply.body, created_at: iso(reply.created_at), is_mine: reply.author_id === auth.user.id, author: manager || reply.author_id === auth.user.id ? (reply.display_name || reply.email) : "CCI Support" })) });
});

academyRoutes.post("/institutions/:code/cci/support/:id/replies/", async (c) => {
  const auth = await requireUser(c); if (!auth.ok) return respond(c, auth.response); const id = c.req.param("id"); const ctx = await cciContext(c, c.req.param("code"), auth.user); if (!ctx || !UUID_RE.test(id)) return respond(c, notFound()); const manager = canManageSupport(ctx, auth.user); const request = await one<{ id: string; requester_id: string }>(`select id,requester_id from academy_ccisupportrequest where id=$1 and institution_id=$2`, [id, ctx.institution.id]); if (!request || (!manager && request.requester_id !== auth.user.id)) return respond(c, notFound());
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>; const message = String(body.body ?? "").trim(); if (!message || message.length > 5000) return respond(c, fieldError({ body: ["Enter a response of 5,000 characters or fewer."] })); const replyId = uuid(); await query(`insert into academy_ccisupportreply (id,request_id,author_id,body,created_at) values ($1,$2,$3,$4,now())`, [replyId, id, auth.user.id, message]); await query(`update academy_ccisupportrequest set status=$1,updated_at=now() where id=$2`, [manager ? "awaiting_response" : "in_progress", id]); return c.json({ id: replyId, body: message }, 201);
});
