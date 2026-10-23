import { Hono } from "hono";
import { count, one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { forbidden, notFound, respond } from "../http";
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
         values ($1, $2, $3, 'student', 7, 22, 96, true, now())`,
        [id, institution.id, user.id],
      );
      membership = {
        id,
        role: "student",
        current_week: 7,
        overall_progress: 22,
        attendance_pct: 96,
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
     where true`;
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

  const assignment = await one<{ id: string }>(
    `select id from academy_assignment where id = $1`,
    [assignmentId],
  );
  if (!assignment) return respond(c, notFound());

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

  return c.json(
    {
      id: saved?.id ?? submissionId,
      status: saved?.status ?? "submitted",
      file_name: saved?.file_name ?? fileName,
      submitted_at: iso(saved?.submitted_at ?? null),
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
