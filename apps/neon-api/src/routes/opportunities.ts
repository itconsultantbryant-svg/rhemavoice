import { Hono } from "hono";
import type { Context } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { detail, notFound, respond } from "../http";
import { bool, iso, str } from "../serializers";

export const opportunitiesRoutes = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OpportunityRow = {
  id: string;
  type: string;
  title: string;
  organization: string;
  description: string;
  location: string;
  country: string;
  category: string;
  amount_label: string;
  deadline: string | null;
  status: string;
  created_at: Date;
  is_saved: boolean;
};

function opportunityColumns(alias: string): string {
  return `
  ${alias}.id, ${alias}.type, ${alias}.title, ${alias}.organization, ${alias}.description,
  ${alias}.location, ${alias}.country, ${alias}.category, ${alias}.amount_label,
  ${alias}.deadline::text as deadline, ${alias}.status, ${alias}.created_at,
  exists (select 1 from opportunities_savedopportunity sv
           where sv.opportunity_id = ${alias}.id and sv.user_id = $1) as is_saved`;
}

function serializeOpportunity(row: OpportunityRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    organization: row.organization,
    description: row.description,
    location: row.location,
    country: row.country,
    category: row.category,
    amount_label: row.amount_label,
    deadline: row.deadline ?? null,
    status: row.status,
    is_saved: bool(row.is_saved),
    created_at: iso(row.created_at),
  };
}

/** Django escapes % and _ before using the term inside an `icontains` LIKE. */
function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function findOpenOpportunity(id: string): Promise<{ id: string } | null> {
  if (!UUID_RE.test(id)) return null;
  return one<{ id: string }>(
    `select id from opportunities_opportunity where status = 'open' and id = $1`,
    [id],
  );
}

const listOpportunities = async (c: Context) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const params: unknown[] = [auth.user.id];
  let sql = `select ${opportunityColumns("o")} from opportunities_opportunity o where o.status = 'open'`;

  const type = c.req.query("type");
  if (type) {
    params.push(type);
    sql += ` and o.type = $${params.length}`;
  }
  const category = c.req.query("category");
  if (category) {
    params.push(`%${escapeLike(category)}%`);
    sql += ` and o.category ilike $${params.length}`;
  }
  const country = c.req.query("country");
  if (country) {
    params.push(`%${escapeLike(country)}%`);
    sql += ` and o.country ilike $${params.length}`;
  }
  sql += ` order by o.created_at desc`;

  const rows = await query<OpportunityRow>(sql, params);
  return c.json(rows.map(serializeOpportunity));
};

opportunitiesRoutes.get("/", listOpportunities);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
opportunitiesRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return listOpportunities(c);
});

// Django registers `me/` before the router include, so the literal path wins
// over the `/:id/` detail route.
opportunitiesRoutes.get("/me/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const applications = await query<OpportunityRow & { application_id: string; application_status: string }>(
    `select ap.id as application_id, ap.status as application_status, ${opportunityColumns("op")}
       from opportunities_opportunityapplication ap
       join opportunities_opportunity op on op.id = ap.opportunity_id
      where ap.user_id = $1
      order by ap.created_at desc`,
    [auth.user.id],
  );

  const saved = await query<OpportunityRow>(
    `select ${opportunityColumns("o")}
       from opportunities_savedopportunity sv
       join opportunities_opportunity o on o.id = sv.opportunity_id
      where sv.user_id = $1
      order by sv.created_at desc`,
    [auth.user.id],
  );

  return c.json({
    applications: applications.map((row) => ({
      id: row.application_id,
      status: row.application_status,
      opportunity: serializeOpportunity(row),
    })),
    saved: saved.map(serializeOpportunity),
  });
});

opportunitiesRoutes.get("/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const row = await one<OpportunityRow>(
    `select ${opportunityColumns("o")}
       from opportunities_opportunity o
      where o.status = 'open' and o.id = $2`,
    [auth.user.id, id],
  );
  if (!row) return respond(c, notFound());
  return c.json(serializeOpportunity(row));
});

opportunitiesRoutes.post("/:id/save_opportunity/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const opp = await findOpenOpportunity(c.req.param("id"));
  if (!opp) return respond(c, notFound());

  const inserted = await one<{ id: string }>(
    `insert into opportunities_savedopportunity (id, opportunity_id, user_id, created_at)
     values ($1, $2, $3, now())
     on conflict (user_id, opportunity_id) do nothing
     returning id`,
    [uuid(), opp.id, auth.user.id],
  );
  if (!inserted) {
    await query(
      `delete from opportunities_savedopportunity where user_id = $1 and opportunity_id = $2`,
      [auth.user.id, opp.id],
    );
    return c.json({ saved: false });
  }
  return c.json({ saved: true });
});

opportunitiesRoutes.post("/:id/apply/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const opp = await findOpenOpportunity(c.req.param("id"));
  if (!opp) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const coverNote = str(body.cover_note);

  const inserted = await one<{ id: string; status: string }>(
    `insert into opportunities_opportunityapplication (id, opportunity_id, user_id, cover_note, status, created_at)
     values ($1, $2, $3, $4, 'submitted', now())
     on conflict (opportunity_id, user_id) do nothing
     returning id, status`,
    [uuid(), opp.id, auth.user.id, coverNote],
  );
  if (!inserted) return respond(c, detail("Already applied."));
  return c.json({ id: inserted.id, status: inserted.status }, 201);
});
