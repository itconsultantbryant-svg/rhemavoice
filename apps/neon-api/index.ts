import { Hono } from "hono";
import type { Context, Next } from "hono";
import { cors } from "hono/cors";
import { chatUpgrade, notificationUpgrade, resolveSocketUser } from "./src/realtime";
import { api } from "./src/routes";

type AppEnv = {
  Variables: {
    userId: string;
  };
};

const app = new Hono<AppEnv>();

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * CORS is scoped to the REST surface only. Response-rewriting middleware
 * (which `cors()` is) breaks the WebSocket upgrade handshake, so the
 * `/ws/*` routes deliberately sit outside this middleware.
 */
app.use(
  "/api/*",
  cors({
    origin: allowedOrigins.length === 1 && allowedOrigins[0] === "*" ? "*" : allowedOrigins,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "X-CCI-Authorization"],
    maxAge: 86400,
  }),
);

app.get("/health/", (c) => c.json({ status: "ok", service: "rhemavoice-api" }));
app.get("/health", (c) => c.json({ status: "ok", service: "rhemavoice-api" }));

app.route("/api/v1", api);

/** Authenticate a WebSocket handshake via the `?token=` query parameter. */
async function socketAuth(c: Context<AppEnv>, next: Next) {
  const token = c.req.query("token");
  const user = await resolveSocketUser(token);
  if (!user) {
    return c.text("unauthorized", 401);
  }
  c.set("userId", user.id);
  await next();
}

const wsRoutes = new Hono<AppEnv>();
wsRoutes.get("/chat/:conversationId/", socketAuth, chatUpgrade());
wsRoutes.get("/chat/:conversationId", socketAuth, chatUpgrade());
wsRoutes.get("/notifications/", socketAuth, notificationUpgrade());
wsRoutes.get("/notifications", socketAuth, notificationUpgrade());
app.route("/ws", wsRoutes);

/**
 * Unmatched routes. The `x-rhemavoice-404` header marks responses that came
 * from the router itself (as opposed to a handler that returned 404 for a
 * missing record), which keeps the two distinguishable to clients and tests.
 */
app.notFound((c) => {
  c.header("x-rhemavoice-404", "route");
  return c.json({ detail: "Not found." }, 404);
});

app.onError((err, c) => {
  console.error("[api]", err);
  return c.json({ detail: "Server error." }, 500);
});

export default {
  fetch: (request: Request, env: unknown, ctx: unknown) => app.fetch(request, env as never, ctx as never),
};
