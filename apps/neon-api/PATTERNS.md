# RhemaVoice → Neon Functions porting guide

The Django backend is being replaced by this Hono app running on Neon Functions.
The **database schema is unchanged** — Neon still holds Django's exact tables
(Django migrations were applied to Neon), so every table/column name below is
Django's. This means a `apps/<django_app>/models.py` file is the source of truth
for table and column names.

## Layout

```
apps/neon-api/
  index.ts          Hono app: CORS on /api/*, /health/, /ws/*, 404 + error handlers
  src/db.ts         pool, query(), one(), count(), tx(), uuid()
  src/auth.ts       JWT sign/verify, issueTokens, rotateTokens, requireUser, roleCodes
  src/password.ts   Django-compatible PBKDF2 password hashing/verification
  src/http.ts       detail(), notFound(), unauthorized(), forbidden(), fieldError(), respond()
  src/serializers.ts serializeUser(), iso(), json(), bool(), num(), str(), optionalStr()
  src/realtime.ts   WebSocket hub (chat + notifications) with Postgres fan-out
  src/routes/*.ts   one file per Django app, each exporting a Hono router
```

## Rules

1. **One route file per Django app.** Export a `Hono` instance named
   `<module>Routes` (e.g. `export const academyRoutes = new Hono()`).
2. **Paths must match `packages/api-client/src/index.ts` exactly**, including
   the trailing slash. That file is the contract the already-deployed Vercel
   frontend uses. The full URL is `/api/v1` + the api-client path.
3. **No new dependencies.** Use `pg` via `src/db.ts`, `hono`, and `node:crypto`.
4. **Raw SQL only** — no ORM. Django table names are `<app_label>_<model_name>`
   in snake_case (e.g. `apps.academy.models.Course` → `academy_course`).
   Django column names are the field names in snake_case. Read the model file
   to get them right.
5. **JSON shapes must match the DRF serializers exactly** — same keys, same
   types, same `null` vs missing. The frontend reads specific keys.
6. **Auth**: every endpoint except the explicitly public ones requires a Bearer
   token. Use `requireUser(c)`:

   ```ts
   const auth = await requireUser(c);
   if (!auth.ok) return respond(c, auth.response);
   const user = auth.user;
   ```

7. **RBAC** — Django's per-app `permissions.py` classes are DEAD CODE (no viewset
   ever declares them). The real behaviour is DRF's global default,
   `IsAuthenticated`. Therefore:

   - Every endpoint requires a Bearer token → `requireUser(c)`.
   - **Only** the `/admin/*` surface requires super admin
     (`is_superuser` OR the `super_admin` role code) → `requireSuperAdmin(user)`.
   - Ordinary member writes (join a room, favourite a track, post a chat
     message, apply to a job, …) are allowed for ANY authenticated user.
     Do NOT gate them behind a module-admin check; doing so breaks the demo
     member account.

   `backend/apps/administration/views.py` (`IsSuperAdmin`),
   `backend/apps/payments/views.py` (`IsAuthenticated` / `AllowAny`) and
   `backend/apps/users/views.py` (`AllowAny` on register/login/otp-verify) are
   the only places with explicit permission classes — mirror them exactly.

8. **Errors** must be DRF-shaped: `{ "detail": "..." }` for general errors,
   `{ "field": ["message"] }` for validation errors.

   ```ts
   return respond(c, detail("Message body required."));
   return respond(c, notFound());
   return respond(c, unauthorized("Invalid credentials."));
   return respond(c, fieldError({ email: ["Enter a valid email address."] }));
   ```

9. **Status codes** must match the Django view (`status.HTTP_201_CREATED` → `c.json(x, 201)`).
10. **Django timestamps** serialise with `isoformat()`. Postgres `timestamptz`
   arrives as a JS `Date`; call `.toISOString()`.
11. **Booleans** arrive as JS booleans. **Numeric/decimal** columns arrive as
    strings — use `num()` from `src/serializers.ts`.
12. **jsonb columns** may arrive as an object or a string — use `json()`.
13. Do **not** add comments explaining the Django original; keep code terse.
    Only add a comment where a non-obvious Django behaviour is being preserved.

## Example (a full route file)

```ts
import { Hono } from "hono";
import { query, one } from "../db";
import { requireUser } from "../auth";
import { detail, notFound, respond } from "../http";
import { iso } from "../serializers";

export const sampleRoutes = new Hono();

sampleRoutes.get("/things/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<{ id: string; title: string; created_at: Date }>(
    `select id, title, created_at from sample_thing order by created_at desc`,
  );
  return c.json(rows.map((r) => ({ id: r.id, title: r.title, created_at: iso(r.created_at) })));
});

sampleRoutes.post("/things/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return respond(c, detail("Title is required."));

  const id = crypto.randomUUID();
  await query(`insert into sample_thing (id, title, created_at) values ($1, $2, now())`, [id, title]);
  return c.json({ id, title }, 201);
});
```

## Checking your work

From the repo root:

```bash
npx tsc --noEmit -p apps/neon-api/tsconfig.json
```

Your file must compile without errors. Do not edit files outside your assigned
route file(s) — the orchestrator wires them into `src/routes/index.ts`.

## Running & deploying

```bash
npm run dev --workspace=@rhemavoice/neon-api   # local function dev server

neon functions deploy rhemavoiceapi \
  --project-id soft-grass-56497276 --branch main \
  --src apps/neon-api --runtime nodejs24 \
  --env JWT_SECRET="<long-random>" \
  --env CORS_ALLOWED_ORIGINS="<vercel-origins>" \
  --env OTP_DEBUG=1 --env OTP_CODE=123456 --env PAYMENTS_MODE=sandbox \
  --wait

./scripts/smoke-api.sh <function-url>
```

Neon injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. Database rebuilds go
through `scripts/migrate-to-neon.sh` (legacy Django migrations + SQLite dump).
