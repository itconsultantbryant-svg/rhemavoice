import { Hono } from "hono";
import { query } from "../db";
import { requireUser } from "../auth";
import { respond } from "../http";
import { bool, iso, num } from "../serializers";

export const storeRoutes = new Hono();

type StoreProductRow = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  sku: string;
  category: string;
  stock: number;
  is_featured: boolean;
  created_at: Date;
};

function serializeStoreProduct(row: StoreProductRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price_cents: num(row.price_cents),
    sku: row.sku,
    category: row.category,
    stock: num(row.stock),
    is_featured: bool(row.is_featured),
    created_at: iso(row.created_at),
  };
}

storeRoutes.get("/products/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const category = c.req.query("category");
  const params: unknown[] = [];
  let sql = `
    select id, title, description, price_cents, sku, category, stock, is_featured, created_at
      from store_storeproduct`;
  if (category) {
    params.push(category);
    sql += ` where category = $${params.length}`;
  }
  sql += ` order by is_featured desc, title asc`;

  const rows = await query<StoreProductRow>(sql, params);
  return c.json(rows.map(serializeStoreProduct));
});
