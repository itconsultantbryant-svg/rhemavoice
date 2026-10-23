import { Hono, type Context } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { detail, notFound, respond } from "../http";
import { bool, iso, json, num } from "../serializers";

export const roomsRoutes = new Hono();

type RoomRow = {
  id: string;
  title: string;
  description: string;
  visibility: string;
  topic: string;
  is_live: boolean;
  participant_count: number;
  max_speakers: number;
  host_name: string;
  scheduled_at: Date | null;
  recording_enabled: boolean;
  created_at: Date;
};

type ParticipantRow = {
  id: string;
  room_id: string;
  display_name: string;
  role: string;
  is_muted: boolean;
  hand_raised: boolean;
  joined_at: Date;
};

type PollRow = {
  id: string;
  room_id: string;
  question: string;
  options: unknown;
  is_active: boolean;
  created_at: Date;
};

type ChatRow = {
  id: string;
  room_id: string;
  display_name: string;
  message: string;
  is_pinned: boolean;
  created_at: Date;
};

const ROOM_FIELDS =
  "id, title, description, visibility, topic, is_live, participant_count, max_speakers, host_name, scheduled_at, recording_enabled, created_at";

const PARTICIPANT_FIELDS =
  "id, room_id, display_name, role, is_muted, hand_raised, joined_at";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function serializeParticipant(row: ParticipantRow) {
  return {
    id: row.id,
    display_name: row.display_name,
    role: row.role,
    is_muted: bool(row.is_muted),
    hand_raised: bool(row.hand_raised),
    joined_at: iso(row.joined_at),
  };
}

function serializePoll(row: PollRow) {
  return {
    id: row.id,
    question: row.question,
    options: json(row.options),
    is_active: bool(row.is_active),
    created_at: iso(row.created_at),
  };
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

function serializeRoom(
  row: RoomRow,
  participants: ParticipantRow[],
  poll: PollRow | null,
  mine: ParticipantRow | null,
) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    topic: row.topic,
    is_live: bool(row.is_live),
    participant_count: num(row.participant_count),
    max_speakers: num(row.max_speakers),
    host_name: row.host_name,
    scheduled_at: iso(row.scheduled_at),
    recording_enabled: bool(row.recording_enabled),
    participants_preview: participants.map(serializeParticipant),
    active_poll: poll ? serializePoll(poll) : null,
    my_participation: mine ? serializeParticipant(mine) : null,
    created_at: iso(row.created_at),
  };
}

// Django's related manager has no default ordering, so the preview is the first 8 rows.
async function participantsPreview(roomIds: string[]): Promise<Map<string, ParticipantRow[]>> {
  const grouped = new Map<string, ParticipantRow[]>();
  if (!roomIds.length) return grouped;
  const rows = await query<ParticipantRow>(
    `select id, room_id, display_name, role, is_muted, hand_raised, joined_at
       from (
         select id, room_id, display_name, role, is_muted, hand_raised, joined_at,
                row_number() over (partition by room_id order by joined_at, id) as rn
           from rooms_roomparticipant
          where room_id = any($1::uuid[]) and is_banned = false
       ) ranked
      where rn <= 8
      order by room_id, rn`,
    [roomIds],
  );
  for (const row of rows) {
    const list = grouped.get(row.room_id);
    if (list) list.push(row);
    else grouped.set(row.room_id, [row]);
  }
  return grouped;
}

// Django's `.first()` on an unordered queryset falls back to ordering by pk.
async function activePolls(roomIds: string[]): Promise<Map<string, PollRow>> {
  const grouped = new Map<string, PollRow>();
  if (!roomIds.length) return grouped;
  const rows = await query<PollRow>(
    `select distinct on (room_id) room_id, id, question, options, is_active, created_at
       from rooms_roompoll
      where room_id = any($1::uuid[]) and is_active = true
      order by room_id, id`,
    [roomIds],
  );
  for (const row of rows) grouped.set(row.room_id, row);
  return grouped;
}

async function myParticipations(
  roomIds: string[],
  userId: string,
): Promise<Map<string, ParticipantRow>> {
  const grouped = new Map<string, ParticipantRow>();
  if (!roomIds.length) return grouped;
  const rows = await query<ParticipantRow>(
    `select id, room_id, display_name, role, is_muted, hand_raised, joined_at
       from rooms_roomparticipant
      where room_id = any($1::uuid[]) and user_id = $2
      order by room_id, id`,
    [roomIds, userId],
  );
  for (const row of rows) {
    if (!grouped.has(row.room_id)) grouped.set(row.room_id, row);
  }
  return grouped;
}

async function findRoom(id: string): Promise<RoomRow | null> {
  if (!isUuid(id)) return null;
  return one<RoomRow>(`select ${ROOM_FIELDS} from rooms_voiceroom where id = $1`, [id]);
}

async function getOrCreateParticipant(
  roomId: string,
  userId: string,
  displayName: string,
): Promise<ParticipantRow> {
  const existing = await one<ParticipantRow>(
    `select ${PARTICIPANT_FIELDS} from rooms_roomparticipant where room_id = $1 and user_id = $2`,
    [roomId, userId],
  );
  if (existing) return existing;
  const created = await one<ParticipantRow>(
    `insert into rooms_roomparticipant
       (id, room_id, user_id, display_name, role, is_muted, hand_raised, is_banned, joined_at)
     values ($1, $2, $3, $4, 'listener', true, false, false, now())
     returning ${PARTICIPANT_FIELDS}`,
    [uuid(), roomId, userId, displayName],
  );
  return created as ParticipantRow;
}

async function refreshParticipantCount(roomId: string): Promise<void> {
  await query(
    `update rooms_voiceroom
        set participant_count = (select count(*) from rooms_roomparticipant where room_id = $1 and is_banned = false)
      where id = $1`,
    [roomId],
  );
}

const listRooms = async (c: Context) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<RoomRow>(
    `select ${ROOM_FIELDS} from rooms_voiceroom order by is_live desc, participant_count desc, title`,
  );
  const roomIds = rows.map((r) => r.id);
  const [previews, polls, mine] = await Promise.all([
    participantsPreview(roomIds),
    activePolls(roomIds),
    myParticipations(roomIds, auth.user.id),
  ]);

  return c.json(
    rows.map((r) =>
      serializeRoom(r, previews.get(r.id) ?? [], polls.get(r.id) ?? null, mine.get(r.id) ?? null),
    ),
  );
};

roomsRoutes.get("/", listRooms);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
roomsRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return listRooms(c);
});

roomsRoutes.get("/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const room = await findRoom(c.req.param("id"));
  if (!room) return respond(c, notFound());

  const [previews, polls, mine] = await Promise.all([
    participantsPreview([room.id]),
    activePolls([room.id]),
    myParticipations([room.id], auth.user.id),
  ]);

  return c.json(
    serializeRoom(room, previews.get(room.id) ?? [], polls.get(room.id) ?? null, mine.get(room.id) ?? null),
  );
});

roomsRoutes.post("/:id/join/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const room = await findRoom(c.req.param("id"));
  if (!room) return respond(c, notFound());

  const user = auth.user;
  const existing = await one<{ id: string }>(
    `select id from rooms_roomparticipant where room_id = $1 and user_id = $2`,
    [room.id, user.id],
  );
  const participant = await getOrCreateParticipant(
    room.id,
    user.id,
    user.display_name || user.first_name || user.email,
  );
  const created = !existing;
  if (created) await refreshParticipantCount(room.id);

  return c.json(serializeParticipant(participant), created ? 201 : 200);
});

roomsRoutes.post("/:id/leave/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const room = await findRoom(c.req.param("id"));
  if (!room) return respond(c, notFound());

  await query(`delete from rooms_roomparticipant where room_id = $1 and user_id = $2`, [
    room.id,
    auth.user.id,
  ]);
  await refreshParticipantCount(room.id);
  return c.json({ detail: "Left room." });
});

roomsRoutes.post("/:id/raise_hand/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const room = await findRoom(c.req.param("id"));
  if (!room) return respond(c, notFound());

  const user = auth.user;
  const participant = await getOrCreateParticipant(
    room.id,
    user.id,
    user.display_name || user.first_name || user.email,
  );
  const raised = !participant.hand_raised;
  await query(`update rooms_roomparticipant set hand_raised = $2 where id = $1`, [
    participant.id,
    raised,
  ]);
  return c.json(serializeParticipant({ ...participant, hand_raised: raised }));
});

roomsRoutes.post("/:id/mute/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const room = await findRoom(c.req.param("id"));
  if (!room) return respond(c, notFound());

  const participant = await one<ParticipantRow>(
    `select ${PARTICIPANT_FIELDS} from rooms_roomparticipant where room_id = $1 and user_id = $2`,
    [room.id, auth.user.id],
  );
  if (!participant) return respond(c, detail("Join the room first."));

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const muted = body.muted === undefined ? !participant.is_muted : Boolean(body.muted);
  await query(`update rooms_roomparticipant set is_muted = $2 where id = $1`, [
    participant.id,
    muted,
  ]);
  return c.json(serializeParticipant({ ...participant, is_muted: muted }));
});

roomsRoutes.post("/:id/chat/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const room = await findRoom(c.req.param("id"));
  if (!room) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const message = String(body.message ?? "").trim();
  if (!message) return respond(c, detail("Message required."));

  const user = auth.user;
  const row = await one<ChatRow>(
    `insert into rooms_roomchatmessage (id, room_id, user_id, display_name, message, is_pinned, created_at)
     values ($1, $2, $3, $4, $5, false, now())
     returning id, room_id, display_name, message, is_pinned, created_at`,
    [uuid(), room.id, user.id, user.display_name || user.first_name || user.email, message],
  );
  return c.json(serializeChat(row as ChatRow), 201);
});

roomsRoutes.get("/:id/messages/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const room = await findRoom(c.req.param("id"));
  if (!room) return respond(c, notFound());

  const rows = await query<ChatRow>(
    `select id, room_id, display_name, message, is_pinned, created_at
       from rooms_roomchatmessage
      where room_id = $1
      order by created_at
      limit 50`,
    [room.id],
  );
  return c.json(rows.map(serializeChat));
});
