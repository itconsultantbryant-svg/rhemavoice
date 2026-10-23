import { Hono } from "hono";
import type { Context } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { detail, respond } from "../http";
import { json } from "../serializers";

export const modulesRoutes = new Hono();

type ModuleRow = {
  code: string;
  name: string;
  description: string;
  icon: string;
  requires_profile: boolean;
  route: string;
  enabled: boolean;
};

type ProfileRow = {
  id: string;
  completed: boolean;
  data: unknown;
};

const listModules = async (c: Context) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const modules = await query<ModuleRow>(
    `select code, name, description, icon, requires_profile, route, enabled
       from modules_moduledefinition
      where enabled = true
      order by sort_order asc, name asc`,
  );

  const profiles = await query<{ module: string }>(
    `select module from modules_moduleprofile
      where user_id = $1 and completed = true
      order by updated_at desc`,
    [auth.user.id],
  );
  const completed = new Set(profiles.map((p) => p.module));

  return c.json(
    modules.map((m) => ({
      id: m.code,
      name: m.name,
      description: m.description,
      icon: m.icon,
      requires_profile: m.requires_profile,
      profile_complete: !m.requires_profile || completed.has(m.code),
      route: m.route,
      enabled: m.enabled,
    })),
  );
};

modulesRoutes.get("/", listModules);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
modulesRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return listModules(c);
});

modulesRoutes.get("/:moduleId/profile/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const moduleId = c.req.param("moduleId");
  const profile = await one<ProfileRow>(
    `select id, completed, data from modules_moduleprofile where user_id = $1 and module = $2`,
    [auth.user.id, moduleId],
  );

  return c.json({
    module: moduleId,
    completed: profile ? profile.completed : false,
    data: profile ? (json(profile.data) ?? {}) : {},
  });
});

modulesRoutes.post("/:moduleId/profile/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const moduleId = c.req.param("moduleId");
  const known = await one<{ id: string }>(
    `select id from modules_moduledefinition where code = $1 and enabled = true`,
    [moduleId],
  );
  if (!known) return respond(c, detail("Unknown module.", 404));

  const payload = (await c.req.json().catch(() => ({}))) as unknown;
  const data = payload === null || payload === undefined ? {} : payload;

  const existing = await one<{ id: string }>(
    `select id from modules_moduleprofile where user_id = $1 and module = $2`,
    [auth.user.id, moduleId],
  );

  if (existing) {
    await query(
      `update modules_moduleprofile set data = $1, completed = true, updated_at = now() where id = $2`,
      [data, existing.id],
    );
  } else {
    await query(
      `insert into modules_moduleprofile (id, user_id, module, data, completed, created_at, updated_at)
       values ($1, $2, $3, $4, true, now(), now())`,
      [uuid(), auth.user.id, moduleId, data],
    );
  }

  // jsonb does not preserve key order, so the stored row is the authoritative payload.
  const saved = await one<ProfileRow>(
    `select id, completed, data from modules_moduleprofile where user_id = $1 and module = $2`,
    [auth.user.id, moduleId],
  );

  return c.json({
    module: moduleId,
    completed: saved ? saved.completed : true,
    data: saved ? (json(saved.data) ?? {}) : {},
  });
});
