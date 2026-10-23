import { Hono } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { notFound, respond } from "../http";
import { bool, iso, num, str } from "../serializers";

export const transportRoutes = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ProviderRow = {
  id: string;
  name: string;
  description: string;
  city: string;
  country: string;
  phone: string;
  services: string;
  rating_avg: string;
  is_verified: boolean;
};

type BookingRow = {
  id: string;
  provider_id: string;
  provider_name: string;
  pickup_location: string;
  destination: string;
  service_type: string;
  notes: string;
  status: string;
  created_at: Date;
};

const PROVIDER_COLUMNS = `
  id, name, description, city, country, phone, services, rating_avg, is_verified`;

const BOOKING_COLUMNS = `
  b.id, b.provider_id, p.name as provider_name, b.pickup_location, b.destination,
  b.service_type, b.notes, b.status, b.created_at`;

function serializeProvider(row: ProviderRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    city: row.city,
    country: row.country,
    phone: row.phone,
    services: row.services,
    rating_avg: num(row.rating_avg),
    is_verified: bool(row.is_verified),
  };
}

function serializeBooking(row: BookingRow) {
  return {
    id: row.id,
    provider: row.provider_id,
    provider_name: row.provider_name,
    pickup_location: row.pickup_location,
    destination: row.destination,
    service_type: row.service_type,
    notes: row.notes,
    status: row.status,
    created_at: iso(row.created_at),
  };
}

/** Django escapes % and _ before using the term inside an `icontains` LIKE. */
function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

transportRoutes.get("/providers/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const params: unknown[] = [];
  let sql = `select ${PROVIDER_COLUMNS} from transport_transportprovider where is_verified = true`;
  const city = c.req.query("city");
  if (city) {
    params.push(`%${escapeLike(city)}%`);
    sql += ` and city ilike $${params.length}`;
  }
  sql += ` order by name`;

  const rows = await query<ProviderRow>(sql, params);
  return c.json(rows.map(serializeProvider));
});

transportRoutes.post("/providers/:id/book/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const provider = await one<{ id: string }>(
    `select id from transport_transportprovider where is_verified = true and id = $1`,
    [id],
  );
  if (!provider) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const bookingId = uuid();

  await query(
    `insert into transport_transportbooking
       (id, provider_id, user_id, pickup_location, destination, service_type, notes, status, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, 'requested', now())`,
    [
      bookingId,
      provider.id,
      auth.user.id,
      str(body.pickup_location),
      str(body.destination),
      str(body.service_type),
      str(body.notes),
    ],
  );

  const row = await one<BookingRow>(
    `select ${BOOKING_COLUMNS}
       from transport_transportbooking b
       join transport_transportprovider p on p.id = b.provider_id
      where b.id = $1`,
    [bookingId],
  );
  if (!row) return respond(c, notFound());
  return c.json(serializeBooking(row), 201);
});

transportRoutes.get("/bookings/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<BookingRow>(
    `select ${BOOKING_COLUMNS}
       from transport_transportbooking b
       join transport_transportprovider p on p.id = b.provider_id
      where b.user_id = $1
      order by b.created_at desc`,
    [auth.user.id],
  );
  return c.json(rows.map(serializeBooking));
});
