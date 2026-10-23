import { Hono } from "hono";
import type { Context } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { notFound, respond } from "../http";
import { bool, iso } from "../serializers";

export const churchRoutes = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ChurchRow = {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  pastor_name: string;
  website: string;
  member_count: number;
  is_verified: boolean;
  created_at: Date;
  is_member: boolean;
  my_role: string | null;
};

type EventRow = {
  id: string;
  church_id: string;
  title: string;
  description: string;
  starts_at: Date | null;
  location: string;
  created_at: Date;
};

const CHURCH_COLUMNS = `
  c.id, c.name, c.city, c.country, c.description, c.pastor_name, c.website,
  c.member_count, c.is_verified, c.created_at,
  (m.id is not null) as is_member, m.role as my_role`;

function serializeEvent(row: EventRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    starts_at: iso(row.starts_at),
    location: row.location,
    created_at: iso(row.created_at) ?? "",
  };
}

async function eventsFor(churchIds: string[]): Promise<Map<string, EventRow[]>> {
  const grouped = new Map<string, EventRow[]>();
  if (!churchIds.length) return grouped;
  const rows = await query<EventRow>(
    `select e.id, e.church_id, e.title, e.description, e.starts_at, e.location, e.created_at
       from church_churchevent e
      where e.church_id = any($1::uuid[])
      order by e.church_id, e.starts_at, e.title`,
    [churchIds],
  );
  for (const row of rows) {
    const bucket = grouped.get(row.church_id);
    if (!bucket) {
      grouped.set(row.church_id, [row]);
      continue;
    }
    if (bucket.length < 5) bucket.push(row);
  }
  return grouped;
}

function serializeChurch(row: ChurchRow, events: EventRow[]) {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    description: row.description,
    pastor_name: row.pastor_name,
    website: row.website,
    member_count: row.member_count,
    is_verified: bool(row.is_verified),
    is_member: bool(row.is_member),
    my_role: row.my_role ?? null,
    upcoming_events: events.slice(0, 5).map(serializeEvent),
    created_at: iso(row.created_at) ?? "",
  };
}

async function listChurches(c: Context) {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<ChurchRow>(
    `select ${CHURCH_COLUMNS}
       from church_church c
       left join church_churchmembership m on m.church_id = c.id and m.user_id = $1
      order by c.name`,
    [auth.user.id],
  );

  const events = await eventsFor(rows.map((r) => r.id));
  return c.json(rows.map((r) => serializeChurch(r, events.get(r.id) ?? [])));
}

churchRoutes.get("/", listChurches);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
churchRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return listChurches(c);
});

churchRoutes.get("/mine/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<ChurchRow>(
    `select ${CHURCH_COLUMNS}
       from church_church c
       join church_churchmembership m on m.church_id = c.id and m.user_id = $1
      order by c.name`,
    [auth.user.id],
  );

  const events = await eventsFor(rows.map((r) => r.id));
  return c.json(rows.map((r) => serializeChurch(r, events.get(r.id) ?? [])));
});

churchRoutes.get("/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const row = await one<ChurchRow>(
    `select ${CHURCH_COLUMNS}
       from church_church c
       left join church_churchmembership m on m.church_id = c.id and m.user_id = $2
      where c.id = $1`,
    [id, auth.user.id],
  );
  if (!row) return respond(c, notFound());

  const events = await eventsFor([row.id]);
  return c.json(serializeChurch(row, events.get(row.id) ?? []));
});

churchRoutes.post("/:id/join/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const church = await one<{ id: string }>(`select id from church_church where id = $1`, [id]);
  if (!church) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const role = body.role === undefined || body.role === null ? "member" : String(body.role);

  const inserted = await one<{ id: string }>(
    `insert into church_churchmembership (id, church_id, user_id, role, joined_at)
     values ($1, $2, $3, $4, now())
     on conflict (church_id, user_id) do nothing
     returning id`,
    [uuid(), church.id, auth.user.id, role],
  );

  if (inserted) {
    await query(
      `update church_church
          set member_count = (select count(*) from church_churchmembership where church_id = $1)
        where id = $1`,
      [church.id],
    );
    return c.json({ joined: true, role, created: true }, 201);
  }

  const existing = await one<{ role: string }>(
    `select role from church_churchmembership where church_id = $1 and user_id = $2`,
    [church.id, auth.user.id],
  );
  return c.json({ joined: true, role: existing?.role ?? role, created: false });
});

churchRoutes.post("/:id/leave/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const church = await one<{ id: string }>(`select id from church_church where id = $1`, [id]);
  if (!church) return respond(c, notFound());

  await query(`delete from church_churchmembership where church_id = $1 and user_id = $2`, [
    church.id,
    auth.user.id,
  ]);
  await query(
    `update church_church
        set member_count = (select count(*) from church_churchmembership where church_id = $1)
      where id = $1`,
    [church.id],
  );

  return c.json({ joined: false });
});
