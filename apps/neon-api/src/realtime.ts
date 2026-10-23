import type { WSContext } from "hono/ws";
import { upgradeWebSocket } from "@neon/functions/hono";
import { query } from "./db";
import { verifyToken, loadUser } from "./auth";

/**
 * Real-time hub for Neon Functions.
 *
 * WebSocket connections are isolated per instance, so cross-instance fan-out
 * goes through Postgres. We poll for new rows (the approach Neon recommends
 * because it keeps scale-to-zero working) and push them to the sockets that
 * live on this instance.
 */

type Room = {
  sockets: Set<WSContext>;
};

const chatRooms = new Map<string, Room>();
const userRooms = new Map<string, Room>();

let chatTimer: ReturnType<typeof setInterval> | null = null;
let chatCursor: { at: string; id: string } | null = null;
let notifTimer: ReturnType<typeof setInterval> | null = null;
let notifCursor: { at: string; id: string } | null = null;

const POLL_MS = 700;
const SEED_LOOKBACK_SECONDS = 30;

function room(map: Map<string, Room>, key: string): Room {
  let r = map.get(key);
  if (!r) {
    r = { sockets: new Set() };
    map.set(key, r);
  }
  return r;
}

function dropRoom(map: Map<string, Room>, key: string) {
  const r = map.get(key);
  if (r && r.sockets.size === 0) map.delete(key);
}

function send(sockets: Set<WSContext>, type: string, payload: unknown) {
  const frame = JSON.stringify({ type, payload });
  for (const socket of sockets) {
    try {
      if (socket.readyState === 1) socket.send(frame);
    } catch {
      /* socket is closing */
    }
  }
}

async function seedCursor(table: "chat_message" | "notifications_notification") {
  const rows = await query<{ at: Date; id: string }>(
    `select created_at as at, id from ${table}
      where created_at > now() - interval '${SEED_LOOKBACK_SECONDS} seconds'
      order by created_at desc, id desc limit 1`,
  );
  return rows.length ? { at: rows[0].at.toISOString(), id: rows[0].id } : null;
}

async function pollChat() {
  if (!chatCursor) {
    chatCursor = await seedCursor("chat_message");
    if (!chatCursor) return;
  }
  const rows = await query<{
    id: string;
    conversation_id: string;
    body: string;
    sender_id: string | null;
    sender_name: string | null;
    created_at: Date;
  }>(
    `select m.id, m.conversation_id, m.body, m.sender_id, m.created_at,
            coalesce(nullif(btrim(concat_ws(' ', u.first_name, u.last_name)), ''), u.username) as sender_name
       from chat_message m
       left join users_user u on u.id = m.sender_id
      where (m.created_at, m.id) > ($1::timestamptz, $2::uuid)
      order by m.created_at, m.id
      limit 200`,
    [chatCursor.at, chatCursor.id],
  );
  for (const row of rows) {
    chatCursor = { at: row.created_at.toISOString(), id: row.id };
    const target = chatRooms.get(row.conversation_id);
    if (!target) continue;
    send(target.sockets, "message", {
      id: row.id,
      body: row.body,
      sender_name: row.sender_name ?? "System",
      sender_id: row.sender_id,
      created_at: row.created_at.toISOString(),
    });
  }
}

async function pollNotifications() {
  if (!notifCursor) {
    notifCursor = await seedCursor("notifications_notification");
    if (!notifCursor) return;
  }
  const rows = await query<{
    id: string;
    user_id: string;
    title: string;
    body: string;
    channel: string;
    category: string;
    action_url: string;
    is_read: boolean;
    created_at: Date;
  }>(
    `select id, user_id, title, body, channel, category, action_url, is_read, created_at
       from notifications_notification
      where (created_at, id) > ($1::timestamptz, $2::uuid)
      order by created_at, id
      limit 200`,
    [notifCursor.at, notifCursor.id],
  );
  for (const row of rows) {
    notifCursor = { at: row.created_at.toISOString(), id: row.id };
    const target = userRooms.get(row.user_id);
    if (!target) continue;
    send(target.sockets, "notification", {
      id: row.id,
      title: row.title,
      body: row.body,
      channel: row.channel,
      category: row.category,
      action_url: row.action_url,
      is_read: row.is_read,
      created_at: row.created_at.toISOString(),
    });
  }
}

function ensureChatPoller() {
  if (chatTimer) return;
  chatTimer = setInterval(() => {
    pollChat().catch((err) => console.error("[realtime:chat]", err));
  }, POLL_MS);
  chatTimer.unref?.();
}

function ensureNotificationPoller() {
  if (notifTimer) return;
  notifTimer = setInterval(() => {
    pollNotifications().catch((err) => console.error("[realtime:notifications]", err));
  }, POLL_MS);
  notifTimer.unref?.();
}

function stopChatPollerIfIdle() {
  if (chatTimer && chatRooms.size === 0) {
    clearInterval(chatTimer);
    chatTimer = null;
    chatCursor = null;
  }
}

function stopNotificationPollerIfIdle() {
  if (notifTimer && userRooms.size === 0) {
    clearInterval(notifTimer);
    notifTimer = null;
    notifCursor = null;
  }
}

const HEARTBEAT_MS = 25_000;

export async function resolveSocketUser(token: string | undefined) {
  if (!token) return null;
  const payload = await verifyToken(token, "access");
  if (!payload?.user_id) return null;
  const user = await loadUser(String(payload.user_id));
  if (!user || !user.is_active) return null;
  return user;
}

export function chatUpgrade() {
  return upgradeWebSocket((c) => {
    const conversationId = c.req.param("conversationId") ?? "";
    const userId = String(c.get("userId") ?? "");
    let socket: WSContext | null = null;
    let beat: ReturnType<typeof setInterval> | null = null;

    const teardown = () => {
      if (beat) {
        clearInterval(beat);
        beat = null;
      }
      if (!socket) return;
      const r = chatRooms.get(conversationId);
      if (r) {
        r.sockets.delete(socket);
        dropRoom(chatRooms, conversationId);
      }
      socket = null;
      stopChatPollerIfIdle();
    };

    return {
      onOpen(_event, ws) {
        socket = ws;
        const r = room(chatRooms, conversationId);
        r.sockets.add(ws);
        ensureChatPoller();
        beat = setInterval(() => {
          try {
            if (ws.readyState === 1) ws.send(JSON.stringify({ type: "ping" }));
          } catch {
            /* ignore */
          }
        }, HEARTBEAT_MS);
        beat.unref?.();
        ws.send(JSON.stringify({ type: "ready", payload: { conversation_id: conversationId } }));
      },

      async onMessage(event, ws) {
        let parsed: { body?: string };
        try {
          parsed = JSON.parse(String(event.data));
        } catch {
          return;
        }
        const body = (parsed.body ?? "").trim();
        if (!body) return;
        try {
          await query(
            `insert into chat_message (id, body, created_at, conversation_id, sender_id)
             values ($1, $2, now(), $3, $4)`,
            [crypto.randomUUID(), body, conversationId, userId],
          );
          await query(`update chat_conversation set updated_at = now() where id = $1`, [conversationId]);
        } catch (err) {
          console.error("[realtime:chat:send]", err);
          try {
            if (ws.readyState === 1) {
              ws.send(JSON.stringify({ type: "error", payload: { detail: "Could not send message." } }));
            }
          } catch {
            /* ignore */
          }
        }
      },

      onClose() {
        teardown();
      },

      onError() {
        teardown();
      },
    };
  });
}

export function notificationUpgrade() {
  return upgradeWebSocket((c) => {
    const userId = String(c.get("userId") ?? "");
    let socket: WSContext | null = null;
    let beat: ReturnType<typeof setInterval> | null = null;

    const teardown = () => {
      if (beat) {
        clearInterval(beat);
        beat = null;
      }
      if (!socket) return;
      const r = userRooms.get(userId);
      if (r) {
        r.sockets.delete(socket);
        dropRoom(userRooms, userId);
      }
      socket = null;
      stopNotificationPollerIfIdle();
    };

    return {
      onOpen(_event, ws) {
        socket = ws;
        const r = room(userRooms, userId);
        r.sockets.add(ws);
        ensureNotificationPoller();
        beat = setInterval(() => {
          try {
            if (ws.readyState === 1) ws.send(JSON.stringify({ type: "ping" }));
          } catch {
            /* ignore */
          }
        }, HEARTBEAT_MS);
        beat.unref?.();
        ws.send(JSON.stringify({ type: "ready", payload: { user_id: userId } }));
      },

      onClose() {
        teardown();
      },

      onError() {
        teardown();
      },
    };
  });
}
