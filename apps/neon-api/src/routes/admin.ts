import { Hono } from "hono";
import type { Context } from "hono";
import { one, query, uuid } from "../db";
import { requireSuperAdmin, requireUser, type AuthUser } from "../auth";
import { detail, notFound, respond } from "../http";
import { bool, iso, json, num } from "../serializers";

export const adminRoutes = new Hono();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AdminAuth = { ok: true; user: AuthUser } | { ok: false; response: Response };

type UserRow = {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar_url: string;
  theme_preference: string;
  is_active: boolean;
  date_joined: Date;
};

type RoleRow = {
  id: string;
  name: string;
  code: string;
};

type ToggleRow = {
  key: string;
  label: string;
  enabled: boolean;
  description: string;
};

type JobRow = {
  id: string;
  title: string;
  company_name: string;
  location: string;
  is_approved: boolean;
  applications: number;
  created_at: Date;
};

type ApplicationRow = {
  id: string;
  job_title: string;
  applicant: string;
  status: string;
  created_at: Date;
};

type OrderRow = {
  id: string;
  reference: string;
  user: string;
  total_cents: number;
  status: string;
  source: string;
  created_at: Date;
};

type ConversationRow = {
  id: string;
  title: string;
  is_group: boolean;
  message_count: number;
  updated_at: Date;
};

type ContentRow = {
  id: string; module: string; slug: string; title: string; summary: string; body: unknown;
  media_url: string; status: string; published_at: Date | null; created_at: Date; updated_at: Date;
};

type ModuleAdminRow = {
  code: string; name: string; description: string; route: string; enabled: boolean; sort_order: number;
};

const USER_COLUMNS = `
  id, email, phone, first_name, last_name, display_name, avatar_url,
  theme_preference, is_active, date_joined`;

async function adminAuth(c: Context): Promise<AdminAuth> {
  const auth = await requireUser(c);
  if (!auth.ok) return { ok: false, response: respond(c, auth.response) };
  const denied = requireSuperAdmin(auth.user);
  if (denied) return { ok: false, response: respond(c, denied) };
  return { ok: true, user: auth.user };
}

async function audit(actorId: string, action: string, meta: unknown = {}): Promise<void> {
  await query(
    `insert into administration_auditlog (id, actor_id, action, meta, created_at)
     values ($1, $2, $3, $4, now())`,
    [uuid(), actorId, action, JSON.stringify(meta)],
  );
}

async function rolesFor(userIds: string[]): Promise<Map<string, string[]>> {
  const grouped = new Map<string, string[]>();
  if (!userIds.length) return grouped;
  const rows = await query<{ user_id: string; code: string }>(
    `select ur.user_id, r.code
       from roles_userrole ur
       join roles_role r on r.id = ur.role_id
      where ur.user_id = any($1::uuid[])
      order by r.code`,
    [userIds],
  );
  for (const row of rows) {
    const bucket = grouped.get(row.user_id);
    if (bucket) bucket.push(row.code);
    else grouped.set(row.user_id, [row.code]);
  }
  return grouped;
}

function serializeUser(row: UserRow, roles: string[]) {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    first_name: row.first_name,
    last_name: row.last_name,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    roles,
    theme_preference: row.theme_preference,
    is_active: bool(row.is_active),
    date_joined: iso(row.date_joined) ?? "",
  };
}

/** Python's `bool()` — every value except falsy ones is truthy. */
function pyBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function serializeContent(row: ContentRow) {
  return { ...row, body: json(row.body) ?? {}, published_at: iso(row.published_at), created_at: iso(row.created_at) ?? "", updated_at: iso(row.updated_at) ?? "" };
}

adminRoutes.get("/users/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const rows = await query<UserRow>(
    `select ${USER_COLUMNS} from users_user order by email limit 100`,
  );
  const roles = await rolesFor(rows.map((r) => r.id));
  return c.json(rows.map((r) => serializeUser(r, roles.get(r.id) ?? [])));
});

adminRoutes.patch("/users/:id/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const user = await one<UserRow>(`select ${USER_COLUMNS} from users_user where id = $1`, [id]);
  if (!user) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  if ("is_active" in body) {
    const isActive = pyBool(body.is_active);
    await query(`update users_user set is_active = $1 where id = $2`, [isActive, user.id]);
    user.is_active = isActive;
    await audit(auth.user.id, `user.${isActive ? "activate" : "suspend"}:${user.email}`);
  }

  if ("role_codes" in body) {
    const raw = body.role_codes;
    const codes = Array.isArray(raw) ? raw.map((code) => String(code)) : [];
    await query(`delete from roles_userrole where user_id = $1`, [user.id]);
    for (const code of codes) {
      const role = await one<{ id: string }>(`select id from roles_role where code = $1`, [code]);
      if (!role) continue;
      await query(
        `insert into roles_userrole (id, user_id, role_id, assigned_at)
         values ($1, $2, $3, now())
         on conflict (user_id, role_id) do nothing`,
        [uuid(), user.id, role.id],
      );
    }
    await audit(auth.user.id, `user.roles:${user.email}`, { roles: raw ?? [] });
  }

  const roles = await rolesFor([user.id]);
  return c.json(serializeUser(user, roles.get(user.id) ?? []));
});

adminRoutes.get("/roles/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const roles = await query<RoleRow>(`select id, name, code from roles_role`);
  const permissions = await query<{ role_id: string; code: string }>(
    `select rp.role_id, p.code
       from roles_role_permissions rp
       join roles_permission p on p.id = rp.permission_id`,
  );

  const byRole = new Map<string, string[]>();
  for (const row of permissions) {
    const bucket = byRole.get(row.role_id);
    if (bucket) bucket.push(row.code);
    else byRole.set(row.role_id, [row.code]);
  }

  return c.json(
    roles.map((role) => ({
      id: role.id,
      name: role.name,
      code: role.code,
      permissions: byRole.get(role.id) ?? [],
    })),
  );
});

adminRoutes.get("/feature-toggles/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const rows = await query<ToggleRow>(
    `select key, label, enabled, description from administration_featuretoggle`,
  );
  return c.json(
    rows.map((row) => ({
      key: row.key,
      label: row.label,
      enabled: bool(row.enabled),
      description: row.description,
    })),
  );
});

adminRoutes.patch("/feature-toggles/:key/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const key = c.req.param("key");
  const toggle = await one<ToggleRow>(
    `select key, label, enabled, description from administration_featuretoggle where key = $1`,
    [key],
  );
  if (!toggle) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const enabled = "enabled" in body ? pyBool(body.enabled) : bool(toggle.enabled);
  await query(`update administration_featuretoggle set enabled = $1 where key = $2`, [enabled, key]);

  await audit(auth.user.id, `feature_toggle.${key}=${enabled ? "on" : "off"}`);

  return c.json({ key: toggle.key, enabled, label: toggle.label });
});

adminRoutes.get("/audit-logs/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const rows = await query<{
    id: string;
    action: string;
    actor: string | null;
    created_at: Date;
  }>(
    `select a.id, a.action, u.email as actor, a.created_at
       from administration_auditlog a
       left join users_user u on u.id = a.actor_id
      order by a.created_at desc
      limit 50`,
  );

  return c.json(
    rows.map((row) => ({
      id: row.id,
      action: row.action,
      actor: row.actor ?? "system",
      created_at: iso(row.created_at) ?? "",
    })),
  );
});

adminRoutes.get("/settings/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const rows = await query<{ key: string; value: unknown }>(
    `select key, value from administration_systemsetting`,
  );
  return c.json(rows.map((row) => ({ key: row.key, value: json(row.value) })));
});

adminRoutes.put("/settings/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = body.key ? String(body.key) : "";
  if (!key) return respond(c, detail("key required"));

  const value = "value" in body ? body.value : {};
  const row = await one<{ key: string; value: unknown }>(
    `insert into administration_systemsetting (id, key, value)
     values ($1, $2, $3::jsonb)
     on conflict (key) do update set value = $3::jsonb
     returning key, value`,
    [uuid(), key, JSON.stringify(value ?? {})],
  );

  await audit(auth.user.id, `system_setting.${key}`);

  return c.json({ key: row?.key ?? key, value: json(row?.value) });
});

adminRoutes.get("/modules/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;
  const rows = await query<ModuleAdminRow>(`select code, name, description, route, enabled, sort_order from modules_moduledefinition order by sort_order, name`);
  return c.json(rows.map((row) => ({ ...row, enabled: bool(row.enabled) })));
});

adminRoutes.patch("/modules/:code/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;
  const code = c.req.param("code");
  const row = await one<ModuleAdminRow>(`select code, name, description, route, enabled, sort_order from modules_moduledefinition where code = $1`, [code]);
  if (!row) return respond(c, notFound());
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const enabled = "enabled" in body ? pyBool(body.enabled) : bool(row.enabled);
  await query(`update modules_moduledefinition set enabled = $1 where code = $2`, [enabled, code]);
  await audit(auth.user.id, `module.${enabled ? "enable" : "disable"}:${code}`);
  return c.json({ ...row, enabled });
});

adminRoutes.get("/content/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;
  const rows = await query<ContentRow>(`select id, module, slug, title, summary, body, media_url, status, published_at, created_at, updated_at from administration_contententry order by updated_at desc limit 200`);
  return c.json(rows.map(serializeContent));
});

adminRoutes.post("/content/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const title = String(body.title ?? "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return respond(c, detail("slug must use lowercase letters, numbers, and hyphens"));
  if (!title) return respond(c, detail("title required"));
  const status = ["draft", "published", "archived"].includes(String(body.status)) ? String(body.status) : "draft";
  const row = await one<ContentRow>(
    `insert into administration_contententry (id, module, slug, title, summary, body, media_url, status, published_at, created_at, updated_at)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,case when $8 = 'published' then now() else null end,now(),now())
     returning id, module, slug, title, summary, body, media_url, status, published_at, created_at, updated_at`,
    [uuid(), String(body.module ?? "platform"), slug, title, String(body.summary ?? ""), JSON.stringify(body.body ?? {}), String(body.media_url ?? ""), status],
  );
  await audit(auth.user.id, `content.create:${slug}`, { module: body.module ?? "platform", status });
  return c.json(serializeContent(row!));
});

adminRoutes.patch("/content/:id/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());
  const current = await one<ContentRow>(`select id, module, slug, title, summary, body, media_url, status, published_at, created_at, updated_at from administration_contententry where id = $1`, [id]);
  if (!current) return respond(c, notFound());
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const status = "status" in body && ["draft", "published", "archived"].includes(String(body.status)) ? String(body.status) : current.status;
  const title = "title" in body ? String(body.title ?? "").trim() : current.title;
  if (!title) return respond(c, detail("title required"));
  const row = await one<ContentRow>(
    `update administration_contententry set module=$1, title=$2, summary=$3, body=$4::jsonb, media_url=$5, status=$6,
       published_at=case when $6 = 'published' and published_at is null then now() when $6 <> 'published' then null else published_at end, updated_at=now()
     where id=$7 returning id, module, slug, title, summary, body, media_url, status, published_at, created_at, updated_at`,
    ["module" in body ? String(body.module ?? "platform") : current.module, title, "summary" in body ? String(body.summary ?? "") : current.summary, JSON.stringify("body" in body ? body.body ?? {} : json(current.body) ?? {}), "media_url" in body ? String(body.media_url ?? "") : current.media_url, status, id],
  );
  await audit(auth.user.id, `content.update:${current.slug}`, { status });
  return c.json(serializeContent(row!));
});

adminRoutes.delete("/content/:id/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;
  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());
  const item = await one<{ slug: string }>(`delete from administration_contententry where id = $1 returning slug`, [id]);
  if (!item) return respond(c, notFound());
  await audit(auth.user.id, `content.delete:${item.slug}`);
  return c.json({ detail: "Deleted" });
});

adminRoutes.get("/integrations/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;
  const rows = await query<{ key: string; value: unknown }>(`select key, value from administration_systemsetting where key like 'integration.%' order by key`);
  return c.json(rows.map((row) => ({ key: row.key.replace(/^integration\./, ""), config: json(row.value) ?? {} })));
});

adminRoutes.put("/integrations/:key/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;
  const key = c.req.param("key");
  if (!/^[a-z0-9_-]+$/i.test(key)) return respond(c, detail("Invalid integration key"));
  const config = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  await query(`insert into administration_systemsetting (id, key, value) values ($1,$2,$3::jsonb) on conflict (key) do update set value=$3::jsonb`, [uuid(), `integration.${key}`, JSON.stringify(config)]);
  await audit(auth.user.id, `integration.configure:${key}`, { enabled: pyBool(config.enabled) });
  return c.json({ key, config });
});

adminRoutes.get("/jobs/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const rows = await query<JobRow>(
    `select j.id, j.title, j.company_name, j.location, j.is_approved, j.created_at,
            (select count(*) from jobs_jobapplication a where a.job_id = j.id) as applications
       from jobs_jobposting j
      order by j.created_at desc
      limit 100`,
  );

  return c.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      company_name: row.company_name,
      location: row.location,
      is_approved: bool(row.is_approved),
      applications: num(row.applications),
      created_at: iso(row.created_at) ?? "",
    })),
  );
});

adminRoutes.post("/jobs/:id/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const job = await one<{ id: string; title: string; is_approved: boolean }>(
    `select id, title, is_approved from jobs_jobposting where id = $1`,
    [id],
  );
  if (!job) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = body.action;
  if (action !== "approve" && action !== "reject") {
    return respond(c, detail("action must be approve|reject"));
  }

  const isApproved = action === "approve";
  await query(`update jobs_jobposting set is_approved = $1 where id = $2`, [isApproved, job.id]);

  await audit(auth.user.id, `job.${action}:${job.title}`);

  return c.json({ id: job.id, is_approved: isApproved });
});

adminRoutes.get("/applications/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const rows = await query<ApplicationRow>(
    `select a.id, j.title as job_title, u.email as applicant, a.status, a.created_at
       from jobs_jobapplication a
       join jobs_jobposting j on j.id = a.job_id
       join users_user u on u.id = a.user_id
      order by a.created_at desc
      limit 100`,
  );

  return c.json(
    rows.map((row) => ({
      id: row.id,
      job_title: row.job_title,
      applicant: row.applicant,
      status: row.status,
      created_at: iso(row.created_at) ?? "",
    })),
  );
});

adminRoutes.patch("/applications/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const appId = body.id ? String(body.id) : "";
  if (!appId || !UUID_RE.test(appId)) return respond(c, notFound());

  const application = await one<{ id: string; job_title: string; status: string }>(
    `select a.id, j.title as job_title, a.status
       from jobs_jobapplication a
       join jobs_jobposting j on j.id = a.job_id
      where a.id = $1`,
    [appId],
  );
  if (!application) return respond(c, notFound());

  const status = body.status;
  const allowed = ["submitted", "reviewing", "interview", "offered", "rejected"];
  if (typeof status !== "string" || !allowed.includes(status)) {
    return respond(c, detail("Invalid status"));
  }

  await query(`update jobs_jobapplication set status = $1 where id = $2`, [status, application.id]);

  await audit(auth.user.id, `application.${status}:${application.job_title}`);

  return c.json({ id: application.id, status });
});

adminRoutes.get("/orders/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const rows = await query<OrderRow>(
    `select o.id, o.reference, u.email as user, o.total_cents, o.status, o.source, o.created_at
       from marketplace_order o
       join users_user u on u.id = o.user_id
      order by o.created_at desc
      limit 100`,
  );

  const items = new Map<string, Array<{ title: string; quantity: number }>>();
  if (rows.length) {
    const itemRows = await query<{ order_id: string; title: string; quantity: number }>(
      `select order_id, title, quantity from marketplace_orderitem where order_id = any($1::uuid[])`,
      [rows.map((r) => r.id)],
    );
    for (const row of itemRows) {
      const bucket = items.get(row.order_id);
      if (bucket) bucket.push({ title: row.title, quantity: row.quantity });
      else items.set(row.order_id, [{ title: row.title, quantity: row.quantity }]);
    }
  }

  return c.json(
    rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      user: row.user,
      total_cents: num(row.total_cents),
      status: row.status,
      source: row.source,
      items: items.get(row.id) ?? [],
      created_at: iso(row.created_at) ?? "",
    })),
  );
});

adminRoutes.post("/orders/:id/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const order = await one<{ id: string; reference: string }>(
    `select id, reference from marketplace_order where id = $1`,
    [id],
  );
  if (!order) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const mapping: Record<string, string> = {
    fulfill: "fulfilled",
    cancel: "cancelled",
    refund: "refunded",
  };
  const action = typeof body.action === "string" ? body.action : "";
  const status = mapping[action];
  if (!status) return respond(c, detail("action must be fulfill|cancel|refund"));

  await query(`update marketplace_order set status = $1 where id = $2`, [status, order.id]);

  await audit(auth.user.id, `order.${action}:${order.reference}`);

  return c.json({ id: order.id, status });
});

adminRoutes.get("/chat/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const rows = await query<ConversationRow>(
    `select c.id, c.title, c.is_group, c.updated_at,
            (select count(*) from chat_message m where m.conversation_id = c.id) as message_count
       from chat_conversation c
      order by c.updated_at desc
      limit 50`,
  );

  const participants = new Map<string, string[]>();
  if (rows.length) {
    const participantRows = await query<{ conversation_id: string; username: string }>(
      `select p.conversation_id, u.username
         from chat_participant p
         join users_user u on u.id = p.user_id
        where p.conversation_id = any($1::uuid[])`,
      [rows.map((r) => r.id)],
    );
    for (const row of participantRows) {
      const bucket = participants.get(row.conversation_id);
      if (bucket) bucket.push(row.username);
      else participants.set(row.conversation_id, [row.username]);
    }
  }

  return c.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      is_group: bool(row.is_group),
      participants: participants.get(row.id) ?? [],
      message_count: num(row.message_count),
      updated_at: iso(row.updated_at) ?? "",
    })),
  );
});

adminRoutes.delete("/chat/messages/:id/", async (c) => {
  const auth = await adminAuth(c);
  if (!auth.ok) return auth.response;

  const id = c.req.param("id");
  if (!UUID_RE.test(id)) return respond(c, notFound());

  const message = await one<{ id: string; body: string }>(
    `select id, body from chat_message where id = $1`,
    [id],
  );
  if (!message) return respond(c, notFound());

  await query(`delete from chat_message where id = $1`, [message.id]);

  await audit(auth.user.id, `chat.delete_message:${message.body.slice(0, 80)}`);

  return c.json({ detail: "Deleted" });
});
