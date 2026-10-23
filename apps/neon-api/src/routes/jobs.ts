import { Hono } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { notFound, respond } from "../http";
import { bool, iso, str } from "../serializers";

export const jobsRoutes = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type JobRow = {
  id: string;
  title: string;
  company_name: string;
  location: string;
  employment_type: string;
  is_remote: boolean;
  description: string;
  salary_range: string;
  created_at: Date;
  is_saved: boolean;
  has_applied: boolean;
};

type ApplicationRow = {
  id: string;
  job_title: string;
  company_name: string;
  status: string;
  cover_note: string;
  created_at: Date;
};

const JOB_COLUMNS = `
  jp.id, jp.title, jp.company_name, jp.location, jp.employment_type, jp.is_remote,
  jp.description, jp.salary_range, jp.created_at,
  exists (select 1 from jobs_savedjob sv where sv.job_id = jp.id and sv.user_id = $1) as is_saved,
  exists (select 1 from jobs_jobapplication ap where ap.job_id = jp.id and ap.user_id = $1) as has_applied`;

const APPLICATION_COLUMNS = `
  ja.id, j.title as job_title, j.company_name, ja.status, ja.cover_note, ja.created_at`;

function serializeJob(row: JobRow) {
  return {
    id: row.id,
    title: row.title,
    company_name: row.company_name,
    location: row.location,
    employment_type: row.employment_type,
    is_remote: bool(row.is_remote),
    description: row.description,
    salary_range: row.salary_range,
    is_saved: bool(row.is_saved),
    has_applied: bool(row.has_applied),
    created_at: iso(row.created_at),
  };
}

function serializeApplication(row: ApplicationRow) {
  return {
    id: row.id,
    job_title: row.job_title,
    company_name: row.company_name,
    status: row.status,
    cover_note: row.cover_note,
    created_at: iso(row.created_at),
  };
}

async function findApprovedJob(id: string): Promise<{ id: string } | null> {
  if (!UUID_RE.test(id)) return null;
  return one<{ id: string }>(
    `select id from jobs_jobposting where is_approved = true and id = $1`,
    [id],
  );
}

jobsRoutes.get("/postings/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<JobRow>(
    `select ${JOB_COLUMNS}
       from jobs_jobposting jp
      where jp.is_approved = true
      order by jp.created_at desc`,
    [auth.user.id],
  );
  return c.json(rows.map(serializeJob));
});

jobsRoutes.get("/postings/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const row = await one<JobRow>(
    `select ${JOB_COLUMNS}
       from jobs_jobposting jp
      where jp.is_approved = true and jp.id = $2`,
    [auth.user.id, id],
  );
  if (!row) return respond(c, notFound());
  return c.json(serializeJob(row));
});

jobsRoutes.post("/postings/:id/save_job/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const job = await findApprovedJob(c.req.param("id"));
  if (!job) return respond(c, notFound());

  const inserted = await one<{ id: string }>(
    `insert into jobs_savedjob (id, job_id, user_id, created_at)
     values ($1, $2, $3, now())
     on conflict (job_id, user_id) do nothing
     returning id`,
    [uuid(), job.id, auth.user.id],
  );
  if (!inserted) {
    await query(`delete from jobs_savedjob where job_id = $1 and user_id = $2`, [
      job.id,
      auth.user.id,
    ]);
    return c.json({ saved: false });
  }
  return c.json({ saved: true }, 201);
});

jobsRoutes.post("/postings/:id/apply/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const job = await findApprovedJob(c.req.param("id"));
  if (!job) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const coverNote = str(body.cover_note);

  const inserted = await one<{ id: string }>(
    `insert into jobs_jobapplication (id, job_id, user_id, cover_note, status, created_at)
     values ($1, $2, $3, $4, 'submitted', now())
     on conflict (job_id, user_id) do nothing
     returning id`,
    [uuid(), job.id, auth.user.id, coverNote],
  );

  const row = await one<ApplicationRow>(
    `select ${APPLICATION_COLUMNS}
       from jobs_jobapplication ja
       join jobs_jobposting j on j.id = ja.job_id
      where ja.job_id = $1 and ja.user_id = $2`,
    [job.id, auth.user.id],
  );
  if (!row) return respond(c, notFound());
  return c.json(serializeApplication(row), inserted ? 201 : 200);
});

jobsRoutes.get("/me/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const applications = await query<ApplicationRow>(
    `select ${APPLICATION_COLUMNS}
       from jobs_jobapplication ja
       join jobs_jobposting j on j.id = ja.job_id
      where ja.user_id = $1
      order by ja.created_at desc`,
    [auth.user.id],
  );

  const saved = await query<JobRow>(
    `select ${JOB_COLUMNS}
       from jobs_savedjob sj
       join jobs_jobposting jp on jp.id = sj.job_id
      where sj.user_id = $1
      order by sj.created_at desc`,
    [auth.user.id],
  );

  return c.json({
    applications: applications.map(serializeApplication),
    saved: saved.map(serializeJob),
  });
});
