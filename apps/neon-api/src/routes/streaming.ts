import { Hono, type Context } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { detail, notFound, respond } from "../http";
import { bool, iso, num } from "../serializers";

export const streamingRoutes = new Hono();

type StreamRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  church_name: string;
  series: string;
  scheduled_at: Date | null;
  viewers: number;
  duration_min: number;
  is_featured: boolean;
  playback_url: string;
  created_at: Date;
};

type ChatRow = {
  id: string;
  stream_id: string;
  display_name: string;
  message: string;
  is_pinned: boolean;
  created_at: Date;
};

const STREAM_FIELDS =
  "id, title, description, status, church_name, series, scheduled_at, viewers, duration_min, is_featured, playback_url, created_at";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function serializeChat(row: ChatRow) {
  return {
    id: row.id,
    display_name: row.display_name,
    message: row.message,
    is_pinned: bool(row.is_pinned),
    created_at: iso(row.created_at),
  };
}

function serializeStream(row: StreamRow, chat: ChatRow[]) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    church_name: row.church_name,
    series: row.series,
    scheduled_at: iso(row.scheduled_at),
    viewers: num(row.viewers),
    duration_min: num(row.duration_min),
    is_featured: bool(row.is_featured),
    playback_url: row.playback_url,
    chat_preview: chat.map(serializeChat),
    created_at: iso(row.created_at),
  };
}

// Django slices the related manager to 5 rows, ordered by the model's `created_at` ordering.
async function chatPreviews(streamIds: string[]): Promise<Map<string, ChatRow[]>> {
  const grouped = new Map<string, ChatRow[]>();
  if (!streamIds.length) return grouped;
  const rows = await query<ChatRow>(
    `select id, stream_id, display_name, message, is_pinned, created_at
       from (
         select id, stream_id, display_name, message, is_pinned, created_at,
                row_number() over (partition by stream_id order by created_at, id) as rn
           from streaming_streamchatmessage
          where stream_id = any($1::uuid[])
       ) ranked
      where rn <= 5
      order by stream_id, rn`,
    [streamIds],
  );
  for (const row of rows) {
    const list = grouped.get(row.stream_id);
    if (list) list.push(row);
    else grouped.set(row.stream_id, [row]);
  }
  return grouped;
}

async function findStream(id: string): Promise<StreamRow | null> {
  if (!isUuid(id)) return null;
  return one<StreamRow>(`select ${STREAM_FIELDS} from streaming_stream where id = $1`, [id]);
}

const listStreams = async (c: Context) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const statusFilter = c.req.query("status");
  const rows = statusFilter
    ? await query<StreamRow>(
        `select ${STREAM_FIELDS} from streaming_stream
          where status = $1
          order by is_featured desc, created_at desc`,
        [statusFilter],
      )
    : await query<StreamRow>(
        `select ${STREAM_FIELDS} from streaming_stream order by is_featured desc, created_at desc`,
      );

  const previews = await chatPreviews(rows.map((r) => r.id));
  return c.json(rows.map((r) => serializeStream(r, previews.get(r.id) ?? [])));
};

streamingRoutes.get("/", listStreams);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
streamingRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return listStreams(c);
});

streamingRoutes.get("/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const stream = await findStream(c.req.param("id"));
  if (!stream) return respond(c, notFound());

  const previews = await chatPreviews([stream.id]);
  return c.json(serializeStream(stream, previews.get(stream.id) ?? []));
});

streamingRoutes.post("/:id/chat/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const stream = await findStream(c.req.param("id"));
  if (!stream) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const message = String(body.message ?? "").trim();
  if (!message) return respond(c, detail("Message required."));

  const user = auth.user;
  const displayName = user.display_name || user.first_name || user.email;
  const row = await one<ChatRow>(
    `insert into streaming_streamchatmessage (id, stream_id, user_id, display_name, message, is_pinned, created_at)
     values ($1, $2, $3, $4, $5, false, now())
     returning id, stream_id, display_name, message, is_pinned, created_at`,
    [uuid(), stream.id, user.id, displayName, message],
  );
  return c.json(serializeChat(row as ChatRow), 201);
});

streamingRoutes.post("/:id/pray/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const stream = await findStream(c.req.param("id"));
  if (!stream) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return respond(c, detail("Title required."));

  const prayerBody = body.body === undefined || body.body === null ? "" : String(body.body);
  const isAnonymous = Boolean(body.is_anonymous ?? false);
  const id = uuid();
  await query(
    `insert into streaming_prayerrequest (id, stream_id, user_id, title, body, is_anonymous, created_at)
     values ($1, $2, $3, $4, $5, $6, now())`,
    [id, stream.id, auth.user.id, title, prayerBody, isAnonymous],
  );
  return c.json({ id, title }, 201);
});
