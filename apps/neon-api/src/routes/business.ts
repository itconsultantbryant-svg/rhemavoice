import { Hono, type Context } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { notFound, respond } from "../http";
import { bool, iso, num } from "../serializers";

export const businessRoutes = new Hono();

type BusinessRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  city: string;
  country: string;
  phone: string;
  website: string;
  verified: boolean;
  featured: boolean;
  rating_avg: number;
  review_count: number;
  created_at: Date;
  category_name: string;
  is_favorite: boolean;
};

type BusinessProductRow = {
  id: string;
  business_id: string;
  title: string;
  price_cents: number;
  description: string;
  is_service: boolean;
};

type BusinessReviewRow = {
  id: string;
  rating: number;
  comment: string;
  created_at: Date;
  author: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `category_name` falls back to the free-text category when there is no category_ref.
const BUSINESS_SELECT = `
  select b.id, b.name, b.category, b.description, b.city, b.country, b.phone, b.website,
         b.verified, b.featured, b.rating_avg, b.review_count, b.created_at,
         coalesce(cat.name, b.category) as category_name,
         exists(select 1 from business_businessfavorite f
                 where f.business_id = b.id and f.user_id = $1) as is_favorite
    from business_business b
    left join business_businesscategory cat on cat.id = b.category_ref_id
`;

function serializeBusinessProduct(row: BusinessProductRow) {
  return {
    id: row.id,
    title: row.title,
    price_cents: num(row.price_cents),
    description: row.description,
    is_service: bool(row.is_service),
  };
}

function serializeBusiness(row: BusinessRow, products: BusinessProductRow[]) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    category_name: row.category_name,
    description: row.description,
    city: row.city,
    country: row.country,
    phone: row.phone,
    website: row.website,
    verified: bool(row.verified),
    featured: bool(row.featured),
    rating_avg: num(row.rating_avg),
    review_count: num(row.review_count),
    products: products.map(serializeBusinessProduct),
    is_favorite: bool(row.is_favorite),
    created_at: iso(row.created_at),
  };
}

function serializeBusinessReview(row: BusinessReviewRow) {
  return {
    id: row.id,
    rating: num(row.rating),
    comment: row.comment,
    author: row.author,
    created_at: iso(row.created_at),
  };
}

// Django rounds half to even.
function round2(value: number): number {
  const scaled = value * 100;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  if (diff > 0.5) return (floor + 1) / 100;
  if (diff < 0.5) return floor / 100;
  return (floor % 2 === 0 ? floor : floor + 1) / 100;
}

function clampRating(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  const rating = Number.isFinite(parsed) ? Math.trunc(parsed) : 5;
  return Math.max(1, Math.min(5, rating));
}

// The related manager has no default ordering, so the products keep their insertion order.
async function businessProducts(
  businessIds: string[],
): Promise<Map<string, BusinessProductRow[]>> {
  const grouped = new Map<string, BusinessProductRow[]>();
  if (!businessIds.length) return grouped;
  const rows = await query<BusinessProductRow>(
    `select id, business_id, title, price_cents, description, is_service
       from business_businessproduct
      where business_id = any($1::uuid[])
      order by created_at asc, id asc`,
    [businessIds],
  );
  for (const row of rows) {
    const bucket = grouped.get(row.business_id);
    if (bucket) bucket.push(row);
    else grouped.set(row.business_id, [row]);
  }
  return grouped;
}

async function findBusiness(id: string, userId: string): Promise<BusinessRow | null> {
  if (!UUID_RE.test(id)) return null;
  return one<BusinessRow>(`${BUSINESS_SELECT} where b.id = $2`, [userId, id]);
}

const listBusinesses = async (c: Context) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<BusinessRow>(
    `${BUSINESS_SELECT} order by b.featured desc, b.verified desc, b.name asc`,
    [auth.user.id],
  );
  const products = await businessProducts(rows.map((r) => r.id));
  return c.json(rows.map((r) => serializeBusiness(r, products.get(r.id) ?? [])));
};

businessRoutes.get("/", listBusinesses);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
businessRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return listBusinesses(c);
});

businessRoutes.get("/categories/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<{ id: string; name: string; slug: string }>(
    `select id, name, slug from business_businesscategory order by id`,
  );
  return c.json(rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug })));
});

businessRoutes.get("/:id/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const business = await findBusiness(c.req.param("id"), auth.user.id);
  if (!business) return respond(c, notFound());

  const products = await businessProducts([business.id]);
  return c.json(serializeBusiness(business, products.get(business.id) ?? []));
});

businessRoutes.post("/:id/favorite/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const business = await findBusiness(c.req.param("id"), user.id);
  if (!business) return respond(c, notFound());

  const existing = await one<{ id: string }>(
    `select id from business_businessfavorite where user_id = $1 and business_id = $2`,
    [user.id, business.id],
  );
  if (existing) {
    await query(`delete from business_businessfavorite where id = $1`, [existing.id]);
    return c.json({ favorited: false });
  }

  await query(
    `insert into business_businessfavorite (id, user_id, business_id, created_at)
     values ($1, $2, $3, now())`,
    [uuid(), user.id, business.id],
  );
  return c.json({ favorited: true }, 201);
});

businessRoutes.post("/:id/review/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const business = await findBusiness(c.req.param("id"), user.id);
  if (!business) return respond(c, notFound());

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const rating = clampRating(body.rating);
  const comment =
    body.comment === undefined || body.comment === null ? "" : String(body.comment);

  const existing = await one<{ id: string }>(
    `select id from business_businessreview where business_id = $1 and user_id = $2`,
    [business.id, user.id],
  );

  const reviewId = existing?.id ?? uuid();
  if (existing) {
    await query(
      `update business_businessreview set rating = $1, comment = $2 where id = $3`,
      [rating, comment, reviewId],
    );
  } else {
    await query(
      `insert into business_businessreview (id, business_id, user_id, rating, comment, created_at)
       values ($1, $2, $3, $4, $5, now())`,
      [reviewId, business.id, user.id, rating, comment],
    );
  }

  const agg = await one<{ avg: string | null; count: string }>(
    `select avg(rating) as avg, count(id) as count
       from business_businessreview where business_id = $1`,
    [business.id],
  );
  const ratingAvg = round2(agg?.avg ? num(agg.avg) : 0);
  const reviewCount = agg ? num(agg.count) : 0;
  await query(
    `update business_business set rating_avg = $1, review_count = $2 where id = $3`,
    [ratingAvg, reviewCount, business.id],
  );

  const review = await one<BusinessReviewRow>(
    `select r.id, r.rating, r.comment, r.created_at, u.display_name as author
       from business_businessreview r
       join users_user u on u.id = r.user_id
      where r.id = $1`,
    [reviewId],
  );
  return c.json(serializeBusinessReview(review as BusinessReviewRow), 201);
});
