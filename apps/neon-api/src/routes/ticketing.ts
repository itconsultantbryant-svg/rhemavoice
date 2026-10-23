import { Hono } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { detail, notFound, respond } from "../http";
import { iso, num } from "../serializers";

export const ticketingRoutes = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type EventRow = {
  id: string;
  title: string;
  organizer: string;
  description: string;
  venue: string;
  city: string;
  country: string;
  starts_at: Date | null;
  category: string;
  banner_url: string;
};

type TierRow = {
  id: string;
  event_id: string;
  name: string;
  price_cents: number;
  quantity_available: number;
};

type OrderRow = {
  id: string;
  event_id: string;
  event_title: string;
  tier_id: string;
  tier_name: string;
  quantity: number;
  total_cents: number;
  status: string;
  created_at: Date;
};

const EVENT_COLUMNS = `
  id, title, organizer, description, venue, city, country, starts_at, category, banner_url`;

const ORDER_COLUMNS = `
  o.id, o.event_id, e.title as event_title, o.tier_id, t.name as tier_name,
  o.quantity, o.total_cents, o.status, o.created_at`;

function serializeTier(row: TierRow) {
  return {
    id: row.id,
    name: row.name,
    price_cents: num(row.price_cents),
    quantity_available: num(row.quantity_available),
  };
}

function serializeEvent(row: EventRow, tiers: TierRow[]) {
  return {
    id: row.id,
    title: row.title,
    organizer: row.organizer,
    description: row.description,
    venue: row.venue,
    city: row.city,
    country: row.country,
    starts_at: iso(row.starts_at),
    category: row.category,
    banner_url: row.banner_url,
    tiers: tiers.map(serializeTier),
  };
}

function serializeOrder(row: OrderRow) {
  return {
    id: row.id,
    event: row.event_id,
    event_title: row.event_title,
    tier: row.tier_id,
    tier_name: row.tier_name,
    quantity: num(row.quantity),
    total_cents: num(row.total_cents),
    status: row.status,
    created_at: iso(row.created_at),
  };
}

/** Django escapes % and _ before using the term inside an `icontains` LIKE. */
function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

async function tiersByEvent(eventIds: string[]): Promise<Map<string, TierRow[]>> {
  const grouped = new Map<string, TierRow[]>();
  if (!eventIds.length) return grouped;
  const rows = await query<TierRow>(
    `select id, event_id, name, price_cents, quantity_available
       from ticketing_tickettier
      where event_id = any($1::uuid[])
      order by id`,
    [eventIds],
  );
  for (const row of rows) {
    const list = grouped.get(row.event_id);
    if (list) list.push(row);
    else grouped.set(row.event_id, [row]);
  }
  return grouped;
}

ticketingRoutes.get("/events/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const params: unknown[] = [];
  let sql = `select ${EVENT_COLUMNS} from ticketing_event where is_published = true`;
  const category = c.req.query("category");
  if (category) {
    params.push(`%${escapeLike(category)}%`);
    sql += ` and category ilike $${params.length}`;
  }
  sql += ` order by starts_at, title`;

  const rows = await query<EventRow>(sql, params);
  const tiers = await tiersByEvent(rows.map((r) => r.id));
  return c.json(rows.map((row) => serializeEvent(row, tiers.get(row.id) ?? [])));
});

ticketingRoutes.get("/events/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const row = await one<EventRow>(
    `select ${EVENT_COLUMNS} from ticketing_event where is_published = true and id = $1`,
    [id],
  );
  if (!row) return respond(c, notFound());

  const tiers = await tiersByEvent([row.id]);
  return c.json(serializeEvent(row, tiers.get(row.id) ?? []));
});

ticketingRoutes.post("/events/:id/purchase/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const event = await one<{ id: string }>(
    `select id from ticketing_event where is_published = true and id = $1`,
    [id],
  );
  if (!event) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const tierId = typeof body.tier_id === "string" ? body.tier_id : "";
  const rawQuantity = body.quantity === undefined || body.quantity === null ? 1 : Number(body.quantity);
  const quantity = Number.isFinite(rawQuantity) ? Math.trunc(rawQuantity) : Number.NaN;
  if (!Number.isFinite(quantity) || quantity < 0) return respond(c, detail("Invalid quantity."));

  if (!UUID_RE.test(tierId)) return respond(c, detail("Invalid ticket tier."));

  const tier = await one<{ id: string; price_cents: number }>(
    `select id, price_cents from ticketing_tickettier where id = $1 and event_id = $2`,
    [tierId, event.id],
  );
  if (!tier) return respond(c, detail("Invalid ticket tier."));

  const orderId = uuid();
  await query(
    `insert into ticketing_ticketorder
       (id, event_id, tier_id, user_id, quantity, total_cents, status, created_at)
     values ($1, $2, $3, $4, $5, $6, 'paid', now())`,
    [orderId, event.id, tier.id, auth.user.id, quantity, num(tier.price_cents) * quantity],
  );

  const row = await one<OrderRow>(
    `select ${ORDER_COLUMNS}
       from ticketing_ticketorder o
       join ticketing_event e on e.id = o.event_id
       join ticketing_tickettier t on t.id = o.tier_id
      where o.id = $1`,
    [orderId],
  );
  if (!row) return respond(c, notFound());
  return c.json(serializeOrder(row), 201);
});

ticketingRoutes.get("/my-tickets/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<OrderRow>(
    `select ${ORDER_COLUMNS}
       from ticketing_ticketorder o
       join ticketing_event e on e.id = o.event_id
       join ticketing_tickettier t on t.id = o.tier_id
      where o.user_id = $1
      order by o.created_at desc`,
    [auth.user.id],
  );
  return c.json(rows.map(serializeOrder));
});
