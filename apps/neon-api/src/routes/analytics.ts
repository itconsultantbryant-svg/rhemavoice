import { Hono } from "hono";
import { count, query } from "../db";
import { requireUser } from "../auth";
import { respond } from "../http";
import { iso, num } from "../serializers";

export const analyticsRoutes = new Hono();

type SnapshotRow = {
  id: string;
  key: string;
  label: string;
  value: number;
  unit: string;
  module: string;
  captured_for: string | null;
  created_at: Date;
};

const SNAPSHOT_COLUMNS = `
  id, key, label, value, unit, module, captured_for::text as captured_for, created_at`;

function serializeSnapshot(row: SnapshotRow) {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    value: num(row.value),
    unit: row.unit,
    module: row.module,
    captured_for: row.captured_for ?? null,
    created_at: iso(row.created_at) ?? "",
  };
}

analyticsRoutes.get("/overview/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const [users, courses, streams, rooms, jobs, products, orders, messages] = await Promise.all([
    count(`select count(*) as n from users_user`),
    count(`select count(*) as n from academy_course`),
    count(`select count(*) as n from streaming_stream`),
    count(`select count(*) as n from rooms_voiceroom`),
    count(`select count(*) as n from jobs_jobposting`),
    count(`select count(*) as n from marketplace_product`),
    count(`select count(*) as n from marketplace_order`),
    count(`select count(*) as n from chat_message`),
  ]);

  const cards = [
    { key: "users", label: "Total Users", value: users, module: "administration" },
    { key: "courses", label: "Courses", value: courses, module: "academy" },
    { key: "streams", label: "Streams", value: streams, module: "streaming" },
    { key: "rooms", label: "Voice Rooms", value: rooms, module: "rooms" },
    { key: "jobs", label: "Job Postings", value: jobs, module: "jobs" },
    { key: "products", label: "Marketplace Items", value: products, module: "marketplace" },
    { key: "orders", label: "Orders", value: orders, module: "marketplace" },
    { key: "messages", label: "Messages", value: messages, module: "chat" },
  ];

  const engagement = await query<{ label: string; value: number; captured_for: string | null }>(
    `select label, value, captured_for::text as captured_for
       from analytics_metricsnapshot
      where module = 'engagement'
      order by captured_for`,
  );

  const module_breakdown = cards
    .filter((card) => card.value)
    .map((card) => ({ module: card.module, value: card.value }));

  return c.json({
    cards,
    engagement_series: engagement.map((row) => ({
      label: row.label,
      value: num(row.value),
      captured_for: row.captured_for ?? null,
    })),
    module_breakdown,
  });
});

analyticsRoutes.get("/snapshots/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const module = c.req.query("module");
  const rows = module
    ? await query<SnapshotRow>(
        `select ${SNAPSHOT_COLUMNS} from analytics_metricsnapshot where module = $1 order by created_at desc`,
        [module],
      )
    : await query<SnapshotRow>(
        `select ${SNAPSHOT_COLUMNS} from analytics_metricsnapshot order by created_at desc`,
      );

  return c.json(rows.map(serializeSnapshot));
});
