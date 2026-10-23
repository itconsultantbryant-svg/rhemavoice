import { Hono } from "hono";
import type { Context } from "hono";
import { count, one, query } from "../db";
import { requireUser } from "../auth";
import { notFound, respond } from "../http";
import { bool, iso } from "../serializers";

export const notificationsRoutes = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  channel: string;
  category: string;
  action_url: string;
  is_read: boolean;
  created_at: Date;
};

function serializeNotification(row: NotificationRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    channel: row.channel,
    category: row.category,
    action_url: row.action_url,
    is_read: bool(row.is_read),
    created_at: iso(row.created_at) ?? "",
  };
}

const listNotifications = async (c: Context) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const unreadOnly = c.req.query("unread") === "true";
  const rows = await query<NotificationRow>(
    `select id, title, body, channel, category, action_url, is_read, created_at
       from notifications_notification
      where user_id = $1 ${unreadOnly ? "and is_read = false" : ""}
      order by created_at desc, id desc`,
    [auth.user.id],
  );

  const unreadCount = await count(
    `select count(*) as n from notifications_notification
      where user_id = $1 and is_read = false`,
    [auth.user.id],
  );

  return c.json({ results: rows.map(serializeNotification), unread_count: unreadCount });
};

notificationsRoutes.get("/", listNotifications);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
notificationsRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return listNotifications(c);
});

// Registered before "/:id/read/" so the literal segment is never taken as an id.
notificationsRoutes.post("/read_all/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  await query(
    `update notifications_notification set is_read = true
      where user_id = $1 and is_read = false`,
    [auth.user.id],
  );
  return c.json({ detail: "All notifications marked as read." });
});

notificationsRoutes.post("/:id/read/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound("Not found."));

  const updated = await one<{ id: string }>(
    `update notifications_notification set is_read = true
      where id = $1 and user_id = $2
      returning id`,
    [id, auth.user.id],
  );
  if (!updated) return respond(c, notFound("Not found."));

  return c.json({ is_read: true });
});
