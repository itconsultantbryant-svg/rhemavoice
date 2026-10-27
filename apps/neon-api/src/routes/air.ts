import { Hono } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { detail, notFound, respond } from "../http";
import { bool, iso, num, str } from "../serializers";

export const airRoutes = new Hono();

function supplierEnabled(): boolean {
  return process.env.AIR_SUPPLIER_ENABLED === "true" && Boolean(process.env.AIR_SUPPLIER_PROVIDER);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AgencyRow = {
  id: string;
  name: string;
  description: string;
  city: string;
  country: string;
  phone: string;
  rating_avg: string;
  is_verified: boolean;
};

type FlightRow = {
  id: string;
  agency_id: string;
  agency_name: string;
  airline: string;
  flight_number: string;
  departure_city: string;
  arrival_city: string;
  departure_at: Date | null;
  arrival_at: Date | null;
  cabin_class: string;
  stops: number;
  price_cents: number;
  currency: string;
};

type BookingRow = {
  id: string;
  flight_id: string;
  departure_city: string;
  arrival_city: string;
  passengers: number;
  passenger_name: string;
  status: string;
  created_at: Date;
};

const AGENCY_COLUMNS = `
  id, name, description, city, country, phone, rating_avg, is_verified`;

const FLIGHT_COLUMNS = `
  f.id, f.agency_id, a.name as agency_name, f.airline, f.flight_number,
  f.departure_city, f.arrival_city, f.departure_at, f.arrival_at,
  f.cabin_class, f.stops, f.price_cents, f.currency`;

const BOOKING_COLUMNS = `
  b.id, b.flight_id, f.departure_city, f.arrival_city,
  b.passengers, b.passenger_name, b.status, b.created_at`;

function serializeAgency(row: AgencyRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    city: row.city,
    country: row.country,
    phone: row.phone,
    rating_avg: num(row.rating_avg),
    is_verified: bool(row.is_verified),
  };
}

function serializeFlight(row: FlightRow) {
  return {
    id: row.id,
    agency: row.agency_id,
    agency_name: row.agency_name,
    airline: row.airline,
    flight_number: row.flight_number,
    departure_city: row.departure_city,
    arrival_city: row.arrival_city,
    departure_at: iso(row.departure_at),
    arrival_at: iso(row.arrival_at),
    cabin_class: row.cabin_class,
    stops: num(row.stops),
    price_cents: num(row.price_cents),
    currency: row.currency,
  };
}

function serializeBooking(row: BookingRow) {
  return {
    id: row.id,
    flight: row.flight_id,
    route: `${row.departure_city} → ${row.arrival_city}`,
    passengers: num(row.passengers),
    passenger_name: row.passenger_name,
    status: row.status,
    created_at: iso(row.created_at),
  };
}

/** Django escapes % and _ before using the term inside an `icontains` LIKE. */
function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

airRoutes.get("/agencies/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<AgencyRow>(
    `select ${AGENCY_COLUMNS} from air_travelagency where is_verified = true order by name`,
  );
  return c.json(rows.map(serializeAgency));
});

airRoutes.get("/flights/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  if (!supplierEnabled()) return c.json({ integration_status: "not_configured", results: [] });
  const params: unknown[] = [];
  const conditions: string[] = [];

  const departure = c.req.query("departure");
  if (departure) {
    params.push(`%${escapeLike(departure)}%`);
    conditions.push(`f.departure_city ilike $${params.length}`);
  }
  const arrival = c.req.query("arrival");
  if (arrival) {
    params.push(`%${escapeLike(arrival)}%`);
    conditions.push(`f.arrival_city ilike $${params.length}`);
  }

  let sql = `select ${FLIGHT_COLUMNS} from air_flightlisting f join air_travelagency a on a.id = f.agency_id`;
  if (conditions.length) sql += ` where ${conditions.join(" and ")}`;
  sql += ` order by f.departure_at`;

  const rows = await query<FlightRow>(sql, params);
  return c.json(rows.map(serializeFlight));
});

airRoutes.post("/flights/:id/book/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  if (!supplierEnabled()) return respond(c, detail("Travel supplier booking is not configured.", 503));

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const flight = await one<{ id: string }>(
    `select id from air_flightlisting where id = $1`,
    [id],
  );
  if (!flight) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawPassengers =
    body.passengers === undefined || body.passengers === null ? 1 : Number(body.passengers);
  const passengers = Number.isFinite(rawPassengers) ? Math.trunc(rawPassengers) : Number.NaN;
  if (!Number.isFinite(passengers) || passengers < 0) {
    return respond(c, detail("Invalid number of passengers."));
  }

  const bookingId = uuid();
  await query(
    `insert into air_flightbooking
       (id, flight_id, user_id, passengers, passenger_name, status, created_at)
     values ($1, $2, $3, $4, $5, 'requested', now())`,
    [bookingId, flight.id, auth.user.id, passengers, str(body.passenger_name)],
  );

  const row = await one<BookingRow>(
    `select ${BOOKING_COLUMNS}
       from air_flightbooking b
       join air_flightlisting f on f.id = b.flight_id
      where b.id = $1`,
    [bookingId],
  );
  if (!row) return respond(c, notFound());
  return c.json(serializeBooking(row), 201);
});

airRoutes.get("/bookings/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<BookingRow>(
    `select ${BOOKING_COLUMNS}
       from air_flightbooking b
       join air_flightlisting f on f.id = b.flight_id
      where b.user_id = $1
      order by b.created_at desc`,
    [auth.user.id],
  );
  return c.json(rows.map(serializeBooking));
});
