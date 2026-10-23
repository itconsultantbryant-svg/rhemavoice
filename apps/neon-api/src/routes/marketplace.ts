import { Hono } from "hono";
import { one, query, tx, uuid } from "../db";
import { requireUser } from "../auth";
import { detail, notFound, respond } from "../http";
import { bool, iso, num } from "../serializers";

export const marketplaceRoutes = new Hono();

type ProductRow = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  product_type: string;
  category: string;
  stock: number;
  rating_avg: number;
  created_at: Date;
  in_wishlist: boolean;
};

type CartItemRow = {
  id: string;
  quantity: number;
  created_at: Date;
  product: ProductRow;
};

type OrderRow = {
  id: string;
  reference: string;
  total_cents: number;
  status: string;
  source: string;
  created_at: Date;
};

type OrderItemRow = {
  id: string;
  title: string;
  unit_price_cents: number;
  quantity: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRODUCT_COLUMNS =
  "p.id, p.title, p.description, p.price_cents, p.product_type, p.category, p.stock, p.rating_avg, p.created_at";

const PRODUCT_SELECT = `
  select ${PRODUCT_COLUMNS},
         exists(select 1 from marketplace_wishlist w
                 where w.product_id = p.id and w.user_id = $1) as in_wishlist
    from marketplace_product p
`;

function serializeProduct(row: ProductRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price_cents: num(row.price_cents),
    product_type: row.product_type,
    category: row.category,
    stock: num(row.stock),
    rating_avg: num(row.rating_avg),
    in_wishlist: bool(row.in_wishlist),
    created_at: iso(row.created_at),
  };
}

// The cart's nested product is serialised without a request, so `in_wishlist` is always false.
function serializeCartItem(row: CartItemRow) {
  return {
    id: row.id,
    product: serializeProduct(row.product),
    quantity: num(row.quantity),
    line_total_cents: num(row.product.price_cents) * num(row.quantity),
  };
}

function serializeOrderItem(row: OrderItemRow) {
  return {
    id: row.id,
    title: row.title,
    unit_price_cents: num(row.unit_price_cents),
    quantity: num(row.quantity),
  };
}

function serializeOrder(row: OrderRow, items: OrderItemRow[]) {
  return {
    id: row.id,
    reference: row.reference,
    total_cents: num(row.total_cents),
    status: row.status,
    source: row.source,
    items: items.map(serializeOrderItem),
    created_at: iso(row.created_at),
  };
}

function parseQuantity(value: unknown): number {
  if (value === undefined || value === null) return 1;
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 1;
}

// The related manager has no default ordering, so the cart keeps its insertion order.
async function cartItems(userId: string): Promise<CartItemRow[]> {
  const rows = await query<{
    id: string;
    quantity: number;
    created_at: Date;
    product_id: string;
    title: string;
    description: string;
    price_cents: number;
    product_type: string;
    category: string;
    stock: number;
    rating_avg: number;
    product_created_at: Date;
  }>(
    `select ci.id, ci.quantity, ci.created_at,
            p.id as product_id, p.title, p.description, p.price_cents, p.product_type,
            p.category, p.stock, p.rating_avg, p.created_at as product_created_at
       from marketplace_cartitem ci
       join marketplace_product p on p.id = ci.product_id
      where ci.user_id = $1
      order by ci.created_at asc, ci.id asc`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    quantity: r.quantity,
    created_at: r.created_at,
    product: {
      id: r.product_id,
      title: r.title,
      description: r.description,
      price_cents: r.price_cents,
      product_type: r.product_type,
      category: r.category,
      stock: r.stock,
      rating_avg: r.rating_avg,
      created_at: r.product_created_at,
      in_wishlist: false,
    },
  }));
}

async function findActiveProduct(id: string, userId: string): Promise<ProductRow | null> {
  if (!UUID_RE.test(id)) return null;
  return one<ProductRow>(`${PRODUCT_SELECT} where p.id = $2 and p.is_active = true`, [
    userId,
    id,
  ]);
}

// The related manager has no default ordering, so the items keep their insertion order.
async function orderItems(orderId: string, ids: string[]): Promise<OrderItemRow[]> {
  const rows = await query<OrderItemRow>(
    `select id, title, unit_price_cents, quantity
       from marketplace_orderitem
      where order_id = $1
      order by array_position($2::uuid[], id)`,
    [orderId, ids],
  );
  return rows;
}

marketplaceRoutes.get("/products/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<ProductRow>(
    `${PRODUCT_SELECT} where p.is_active = true order by p.created_at desc`,
    [auth.user.id],
  );
  return c.json(rows.map(serializeProduct));
});

marketplaceRoutes.get("/products/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const product = await findActiveProduct(c.req.param("id"), auth.user.id);
  if (!product) return respond(c, notFound());
  return c.json(serializeProduct(product));
});

marketplaceRoutes.post("/products/:id/wishlist/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const product = await findActiveProduct(c.req.param("id"), user.id);
  if (!product) return respond(c, notFound());

  const existing = await one<{ id: string }>(
    `select id from marketplace_wishlist where user_id = $1 and product_id = $2`,
    [user.id, product.id],
  );
  if (existing) {
    await query(`delete from marketplace_wishlist where id = $1`, [existing.id]);
    return c.json({ wishlisted: false });
  }

  await query(
    `insert into marketplace_wishlist (id, user_id, product_id, created_at)
     values ($1, $2, $3, now())`,
    [uuid(), user.id, product.id],
  );
  return c.json({ wishlisted: true }, 201);
});

marketplaceRoutes.get("/cart/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const items = await cartItems(auth.user.id);
  const total = items.reduce(
    (sum, item) => sum + num(item.product.price_cents) * num(item.quantity),
    0,
  );
  return c.json({ items: items.map(serializeCartItem), total_cents: total });
});

marketplaceRoutes.post("/cart/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const productId = String(body.product_id ?? "");
  const quantity = parseQuantity(body.quantity);

  const product = await findActiveProduct(productId, user.id);
  if (!product) return respond(c, notFound("Product not found."));

  const existing = await one<{ id: string; quantity: number }>(
    `select id, quantity from marketplace_cartitem where user_id = $1 and product_id = $2`,
    [user.id, product.id],
  );

  const itemId = existing?.id ?? uuid();
  const finalQuantity = existing ? num(existing.quantity) + quantity : quantity;
  if (existing) {
    await query(`update marketplace_cartitem set quantity = $1 where id = $2`, [
      finalQuantity,
      itemId,
    ]);
  } else {
    await query(
      `insert into marketplace_cartitem (id, user_id, product_id, quantity, created_at)
       values ($1, $2, $3, $4, now())`,
      [itemId, user.id, product.id, finalQuantity],
    );
  }

  const item: CartItemRow = {
    id: itemId,
    quantity: finalQuantity,
    created_at: new Date(),
    product: { ...product, in_wishlist: false },
  };
  return c.json(serializeCartItem(item), 201);
});

marketplaceRoutes.delete("/cart/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const itemId = String(body.item_id ?? "");
  if (UUID_RE.test(itemId)) {
    await query(`delete from marketplace_cartitem where user_id = $1 and id = $2`, [
      auth.user.id,
      itemId,
    ]);
  }
  return c.json({ detail: "Removed." });
});

marketplaceRoutes.post("/checkout/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const source =
    body.source === undefined || body.source === null ? "marketplace" : String(body.source);

  const items = await cartItems(user.id);
  if (!items.length) return respond(c, detail("Cart is empty."));

  const total = items.reduce(
    (sum, item) => sum + num(item.product.price_cents) * num(item.quantity),
    0,
  );

  const orderId = uuid();
  const reference = `RV-${uuid().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const itemIds = items.map(() => uuid());

  await tx(async (client) => {
    await client.query(
      `insert into marketplace_order (id, user_id, reference, total_cents, status, source, created_at)
       values ($1, $2, $3, $4, 'paid', $5, now())`,
      [orderId, user.id, reference, total, source],
    );
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      await client.query(
        `insert into marketplace_orderitem
           (id, order_id, product_id, title, unit_price_cents, quantity)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          itemIds[i],
          orderId,
          item.product.id,
          item.product.title,
          num(item.product.price_cents),
          num(item.quantity),
        ],
      );
    }
    await client.query(`delete from marketplace_cartitem where user_id = $1`, [user.id]);
  });

  const order = await one<OrderRow>(
    `select id, reference, total_cents, status, source, created_at
       from marketplace_order where id = $1`,
    [orderId],
  );
  const orderItemRows = await orderItems(orderId, itemIds);
  return c.json(serializeOrder(order as OrderRow, orderItemRows), 201);
});

marketplaceRoutes.get("/orders/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<OrderRow>(
    `select id, reference, total_cents, status, source, created_at
       from marketplace_order where user_id = $1 order by created_at desc`,
    [auth.user.id],
  );

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  if (rows.length) {
    const itemRows = await query<OrderItemRow & { order_id: string }>(
      `select id, order_id, title, unit_price_cents, quantity
         from marketplace_orderitem where order_id = any($1::uuid[]) order by id`,
      [rows.map((r) => r.id)],
    );
    for (const row of itemRows) {
      const bucket = itemsByOrder.get(row.order_id);
      if (bucket) bucket.push(row);
      else itemsByOrder.set(row.order_id, [row]);
    }
  }

  return c.json(rows.map((r) => serializeOrder(r, itemsByOrder.get(r.id) ?? [])));
});
