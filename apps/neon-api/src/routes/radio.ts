import { Hono } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { notFound, respond } from "../http";
import { bool, iso, num } from "../serializers";

export const radioRoutes = new Hono();

type StationRow = {
  id: string;
  name: string;
  genre: string;
  description: string;
  stream_url: string;
  presenters: string;
  is_live: boolean;
  listeners: number;
  created_at: Date;
};

type PodcastRow = {
  id: string;
  station_id: string | null;
  title: string;
  host: string;
  duration_min: number;
  description: string;
  created_at: Date;
};

const STATION_FIELDS =
  "id, name, genre, description, stream_url, presenters, is_live, listeners, created_at";

const PODCAST_FIELDS = "id, station_id, title, host, duration_min, description, created_at";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function serializePodcast(row: PodcastRow) {
  return {
    id: row.id,
    title: row.title,
    host: row.host,
    duration_min: num(row.duration_min),
    description: row.description,
    created_at: iso(row.created_at),
  };
}

function serializeStation(
  row: StationRow,
  podcasts: PodcastRow[],
  isFavorite: boolean,
) {
  // A database flag alone is not proof of a reachable broadcast. Until a
  // streaming provider is configured, clients must not present demo/example
  // streams as live or expose a non-functional player URL.
  const streamConfigured = process.env.RADIO_STREAMING_ENABLED === "true" &&
    /^https:\/\//i.test(row.stream_url) && !/example\.com/i.test(row.stream_url);
  return {
    id: row.id,
    name: row.name,
    genre: row.genre,
    description: row.description,
    stream_url: streamConfigured ? row.stream_url : "",
    presenters: row.presenters,
    is_live: streamConfigured && bool(row.is_live),
    listeners: num(row.listeners),
    is_favorite: isFavorite,
    podcasts: podcasts.map(serializePodcast),
    created_at: iso(row.created_at),
  };
}

// The related manager keeps the Podcast model's `-created_at` ordering.
async function stationPodcasts(stationIds: string[]): Promise<Map<string, PodcastRow[]>> {
  const grouped = new Map<string, PodcastRow[]>();
  if (!stationIds.length) return grouped;
  const rows = await query<PodcastRow>(
    `select ${PODCAST_FIELDS}
       from radio_podcast
      where station_id = any($1::uuid[])
      order by station_id, created_at desc`,
    [stationIds],
  );
  for (const row of rows) {
    const key = row.station_id ?? "";
    const list = grouped.get(key);
    if (list) list.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}

async function favoriteStationIds(userId: string, stationIds: string[]): Promise<Set<string>> {
  if (!stationIds.length) return new Set();
  const rows = await query<{ station_id: string }>(
    `select station_id from radio_radiofavorite where user_id = $1 and station_id = any($2::uuid[])`,
    [userId, stationIds],
  );
  return new Set(rows.map((r) => r.station_id));
}

async function findStation(id: string): Promise<StationRow | null> {
  if (!isUuid(id)) return null;
  return one<StationRow>(`select ${STATION_FIELDS} from radio_radiostation where id = $1`, [id]);
}

// The literal path must be registered before the `:id` route.
radioRoutes.get("/stations/podcasts/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<PodcastRow>(
    `select ${PODCAST_FIELDS} from radio_podcast order by created_at desc limit 30`,
  );
  return c.json(rows.map(serializePodcast));
});

radioRoutes.get("/stations/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const station = await findStation(c.req.param("id"));
  if (!station) return respond(c, notFound());

  const [podcasts, favorites] = await Promise.all([
    stationPodcasts([station.id]),
    favoriteStationIds(auth.user.id, [station.id]),
  ]);
  return c.json(
    serializeStation(station, podcasts.get(station.id) ?? [], favorites.has(station.id)),
  );
});

radioRoutes.post("/stations/:id/favorite/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const station = await findStation(c.req.param("id"));
  if (!station) return respond(c, notFound());

  const existing = await one<{ id: string }>(
    `select id from radio_radiofavorite where user_id = $1 and station_id = $2`,
    [auth.user.id, station.id],
  );
  if (existing) {
    await query(`delete from radio_radiofavorite where id = $1`, [existing.id]);
    return c.json({ favorited: false });
  }
  await query(
    `insert into radio_radiofavorite (id, user_id, station_id, created_at) values ($1, $2, $3, now())`,
    [uuid(), auth.user.id, station.id],
  );
  return c.json({ favorited: true }, 201);
});

radioRoutes.get("/stations/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<StationRow>(
    `select ${STATION_FIELDS} from radio_radiostation order by name`,
  );
  const [podcasts, favorites] = await Promise.all([
    stationPodcasts(rows.map((r) => r.id)),
    favoriteStationIds(auth.user.id, rows.map((r) => r.id)),
  ]);

  return c.json(
    rows.map((r) => serializeStation(r, podcasts.get(r.id) ?? [], favorites.has(r.id))),
  );
});
