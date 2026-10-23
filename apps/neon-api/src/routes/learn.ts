import { Hono } from "hono";
import { query } from "../db";
import { requireUser } from "../auth";
import { respond } from "../http";
import { iso } from "../serializers";

export const learnRoutes = new Hono();

learnRoutes.get("/areas/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<{ id: string; name: string; slug: string; description: string }>(
    `select id, name, slug, description from learn_learningarea order by name asc`,
  );

  return c.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
    })),
  );
});

learnRoutes.get("/lessons/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<{
    id: string;
    area_id: string;
    area_name: string;
    title: string;
    description: string;
    teacher_name: string;
    is_voice: boolean;
    created_at: Date;
  }>(
    `select l.id, l.area_id, a.name as area_name, l.title, l.description, l.teacher_name,
            l.is_voice, l.created_at
       from learn_lesson l
       join learn_learningarea a on a.id = l.area_id
      order by l.title asc`,
  );

  return c.json(
    rows.map((row) => ({
      id: row.id,
      area: row.area_id,
      area_name: row.area_name,
      title: row.title,
      description: row.description,
      teacher_name: row.teacher_name,
      is_voice: row.is_voice,
      created_at: iso(row.created_at),
    })),
  );
});

learnRoutes.get("/sessions/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const status = c.req.query("status");
  const params: unknown[] = [];
  let sql = `
    select id, lesson_id, title, host_name, status, starts_at, participant_count
      from learn_learningsession`;
  if (status) {
    params.push(status);
    sql += ` where status = $${params.length}`;
  }
  sql += ` order by starts_at desc, title asc`;

  const rows = await query<{
    id: string;
    lesson_id: string | null;
    title: string;
    host_name: string;
    status: string;
    starts_at: Date | null;
    participant_count: number;
  }>(sql, params);

  return c.json(
    rows.map((row) => ({
      id: row.id,
      lesson: row.lesson_id,
      title: row.title,
      host_name: row.host_name,
      status: row.status,
      starts_at: iso(row.starts_at),
      participant_count: row.participant_count,
    })),
  );
});
