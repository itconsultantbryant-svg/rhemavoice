import { Hono } from "hono";
import { one, query } from "../db";
import { notFound, respond } from "../http";
import { iso, json } from "../serializers";

export const contentRoutes = new Hono();

type ContentRow = { id: string; module: string; slug: string; title: string; summary: string; body: unknown; media_url: string; published_at: Date | null; updated_at: Date };
const serialize = (row: ContentRow) => ({ ...row, body: json(row.body) ?? {}, published_at: iso(row.published_at), updated_at: iso(row.updated_at) ?? "" });

// Published entries are intentionally readable without authentication so web,
// mobile, and external public pages receive changes immediately.
contentRoutes.get("/", async (c) => {
  const module = c.req.query("module");
  const rows = await query<ContentRow>(`select id, module, slug, title, summary, body, media_url, published_at, updated_at from administration_contententry where status = 'published' ${module ? "and module = $1" : ""} order by published_at desc`, module ? [module] : []);
  return c.json(rows.map(serialize));
});

contentRoutes.get("/:slug/", async (c) => {
  const row = await one<ContentRow>(`select id, module, slug, title, summary, body, media_url, published_at, updated_at from administration_contententry where slug = $1 and status = 'published'`, [c.req.param("slug")]);
  if (!row) return respond(c, notFound());
  return c.json(serialize(row));
});
