import { Hono, type Context } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { detail, notFound, respond } from "../http";
import { bool, iso } from "../serializers";

export const chatRoutes = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Django's `get_full_name() or get_username()`.
const DISPLAY_NAME = `coalesce(nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''), u.username)`;

type ConversationRow = {
  id: string;
  title: string;
  is_group: boolean;
  updated_at: Date;
};

type MessageRow = {
  id: string;
  body: string;
  created_at: Date;
  sender_id: string | null;
  sender_name: string | null;
};

type ConversationListRow = {
  id: string;
  title: string;
  is_group: boolean;
  updated_at: Date;
  last_id: string | null;
  last_body: string | null;
  last_created_at: Date | null;
  last_sender_id: string | null;
  last_sender_name: string | null;
  unread_count: string;
};

function serializeMessage(row: MessageRow, userId: string) {
  return {
    id: row.id,
    body: row.body,
    sender_name: row.sender_name ?? "System",
    sender_id: row.sender_id,
    is_mine: row.sender_id !== null && row.sender_id === userId,
    created_at: iso(row.created_at),
  };
}

function serializeConversation(
  row: ConversationRow,
  lastMessage: MessageRow | null,
  unreadCount: number,
  names: string[],
  userId: string,
) {
  return {
    id: row.id,
    title: row.title,
    is_group: bool(row.is_group),
    last_message: lastMessage ? serializeMessage(lastMessage, userId) : null,
    unread_count: unreadCount,
    participant_names: names,
    updated_at: iso(row.updated_at),
  };
}

// The M2M manager inherits the related model's default ordering (User.Meta.ordering = email).
async function participantNames(conversationIds: string[]): Promise<Map<string, string[]>> {
  const grouped = new Map<string, string[]>();
  if (!conversationIds.length) return grouped;
  const rows = await query<{ conversation_id: string; display_name: string }>(
    `select cp.conversation_id, ${DISPLAY_NAME} as display_name
       from chat_participant cp
       join users_user u on u.id = cp.user_id
      where cp.conversation_id = any($1::uuid[])
      order by u.email`,
    [conversationIds],
  );
  for (const row of rows) {
    const list = grouped.get(row.conversation_id);
    if (!list) grouped.set(row.conversation_id, [row.display_name]);
    else if (list.length < 5) list.push(row.display_name);
  }
  return grouped;
}

async function findConversation(id: string, userId: string): Promise<ConversationRow | null> {
  if (!UUID_RE.test(id)) return null;
  return one<ConversationRow>(
    `select c.id, c.title, c.is_group, c.updated_at
       from chat_conversation c
       join chat_participant cp on cp.conversation_id = c.id and cp.user_id = $2
      where c.id = $1`,
    [id, userId],
  );
}

async function fetchMessage(id: string): Promise<MessageRow | null> {
  return one<MessageRow>(
    `select m.id, m.body, m.created_at, m.sender_id, ${DISPLAY_NAME} as sender_name
       from chat_message m
       left join users_user u on u.id = m.sender_id
      where m.id = $1`,
    [id],
  );
}

const listConversations = async (c: Context) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const userId = auth.user.id;

  const rows = await query<ConversationListRow>(
    `select c.id, c.title, c.is_group, c.updated_at,
            lm.id as last_id, lm.body as last_body, lm.created_at as last_created_at,
            lm.sender_id as last_sender_id, lm.sender_name as last_sender_name,
            (select count(*)
               from chat_message m
              where m.conversation_id = c.id
                and m.sender_id is distinct from $1
                and m.created_at > coalesce(mine.last_read_at, '-infinity'::timestamptz)) as unread_count
       from chat_conversation c
       join chat_participant mine on mine.conversation_id = c.id and mine.user_id = $1
       left join lateral (
             select m.id, m.body, m.created_at, m.sender_id,
                    ${DISPLAY_NAME} as sender_name
               from chat_message m
               left join users_user u on u.id = m.sender_id
              where m.conversation_id = c.id
              order by m.created_at desc
              limit 1
            ) lm on true
      order by c.updated_at desc`,
    [userId],
  );

  const names = await participantNames(rows.map((r) => r.id));

  return c.json(
    rows.map((row) =>
      serializeConversation(
        { id: row.id, title: row.title, is_group: row.is_group, updated_at: row.updated_at },
        row.last_id
          ? {
              id: row.last_id,
              body: row.last_body ?? "",
              created_at: row.last_created_at as Date,
              sender_id: row.last_sender_id,
              sender_name: row.last_sender_name,
            }
          : null,
        Number(row.unread_count),
        names.get(row.id) ?? [],
        userId,
      ),
    ),
  );
};

chatRoutes.get("/", listConversations);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
chatRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return listConversations(c);
});

chatRoutes.post("/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const userId = auth.user.id;

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = body.title === undefined || body.title === null ? "" : String(body.title);
  const rawParticipants = body.participant_ids;
  const participantIds = Array.isArray(rawParticipants) ? rawParticipants.map((v) => String(v)) : [];
  const isGroup =
    body.is_group === undefined || body.is_group === null
      ? participantIds.length > 1
      : Boolean(body.is_group);

  const conversationId = uuid();
  await query(
    `insert into chat_conversation (id, title, is_group, created_at, updated_at)
     values ($1, $2, $3, now(), now())`,
    [conversationId, title, isGroup],
  );
  await query(
    `insert into chat_participant (id, conversation_id, user_id, last_read_at, joined_at)
     values ($1, $2, $3, null, now())`,
    [uuid(), conversationId, userId],
  );

  for (const uid of participantIds) {
    if (!UUID_RE.test(uid)) continue;
    const participant = await one<{ id: string }>(
      `select id from users_user where id = $1`,
      [uid],
    );
    if (!participant) continue;
    await query(
      `insert into chat_participant (id, conversation_id, user_id, last_read_at, joined_at)
       values ($1, $2, $3, null, now())
       on conflict (conversation_id, user_id) do nothing`,
      [uuid(), conversationId, uid],
    );
  }

  const row = await one<ConversationRow>(
    `select id, title, is_group, updated_at from chat_conversation where id = $1`,
    [conversationId],
  );
  if (!row) return respond(c, notFound());

  const names = await participantNames([conversationId]);
  return c.json(serializeConversation(row, null, 0, names.get(conversationId) ?? [], userId), 201);
});

chatRoutes.post("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const userId = auth.user.id;

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = body.title === undefined || body.title === null ? "" : String(body.title);
  const rawParticipants = body.participant_ids;
  const participantIds = Array.isArray(rawParticipants) ? rawParticipants.map((v) => String(v)) : [];
  const isGroup =
    body.is_group === undefined || body.is_group === null
      ? participantIds.length > 1
      : Boolean(body.is_group);

  const conversationId = uuid();
  await query(
    `insert into chat_conversation (id, title, is_group, created_at, updated_at)
     values ($1, $2, $3, now(), now())`,
    [conversationId, title, isGroup],
  );
  await query(
    `insert into chat_participant (id, conversation_id, user_id, last_read_at, joined_at)
     values ($1, $2, $3, null, now())`,
    [uuid(), conversationId, userId],
  );

  for (const uid of participantIds) {
    if (!UUID_RE.test(uid)) continue;
    const participant = await one<{ id: string }>(`select id from users_user where id = $1`, [uid]);
    if (!participant) continue;
    await query(
      `insert into chat_participant (id, conversation_id, user_id, last_read_at, joined_at)
       values ($1, $2, $3, null, now())
       on conflict (conversation_id, user_id) do nothing`,
      [uuid(), conversationId, uid],
    );
  }

  const row = await one<ConversationRow>(
    `select id, title, is_group, updated_at from chat_conversation where id = $1`,
    [conversationId],
  );
  if (!row) return respond(c, notFound());

  const names = await participantNames([conversationId]);
  return c.json(serializeConversation(row, null, 0, names.get(conversationId) ?? [], userId), 201);
});

chatRoutes.get("/:id/messages/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const userId = auth.user.id;

  const conversation = await findConversation(c.req.param("id"), userId);
  if (!conversation) return respond(c, notFound());

  await query(
    `update chat_participant set last_read_at = now() where conversation_id = $1 and user_id = $2`,
    [conversation.id, userId],
  );

  const rows = await query<MessageRow>(
    `select m.id, m.body, m.created_at, m.sender_id, ${DISPLAY_NAME} as sender_name
       from chat_message m
       left join users_user u on u.id = m.sender_id
      where m.conversation_id = $1
      order by m.created_at`,
    [conversation.id],
  );
  return c.json(rows.map((row) => serializeMessage(row, userId)));
});

chatRoutes.post("/:id/messages/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const userId = auth.user.id;

  const conversation = await findConversation(c.req.param("id"), userId);
  if (!conversation) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = String(body.body ?? "").trim();
  if (!text) return respond(c, detail("Message body required."));

  const messageId = uuid();
  await query(
    `insert into chat_message (id, body, created_at, conversation_id, sender_id)
     values ($1, $2, now(), $3, $4)`,
    [messageId, text, conversation.id, userId],
  );
  await query(`update chat_conversation set updated_at = now() where id = $1`, [conversation.id]);

  const message = await fetchMessage(messageId);
  if (!message) return respond(c, notFound());
  return c.json(serializeMessage(message, userId), 201);
});
