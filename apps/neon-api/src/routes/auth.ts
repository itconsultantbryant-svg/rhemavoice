import { Hono } from "hono";
import { query, one } from "../db";
import { hashPassword, verifyPassword } from "../password";
import { issueTokens, rotateTokens, blacklistRefresh, requireUser, loadUser } from "../auth";
import { serializeUser } from "../serializers";
import { detail, fieldError, notFound, respond, unauthorized } from "../http";

const OTP_DEBUG = (process.env.OTP_DEBUG ?? "1") === "1";
const OTP_CODE = process.env.OTP_CODE ?? "123456";
const OTP_TTL_SECONDS = Number.parseInt(process.env.OTP_TTL_SECONDS ?? "600", 10);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const authRoutes = new Hono();

async function issueOtp(userId: string, purpose: "login" | "register") {
  const code = OTP_DEBUG ? OTP_CODE : String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  const id = crypto.randomUUID();
  await query(
    `insert into users_otpchallenge (id, user_id, code, purpose, is_used, created_at, expires_at)
     values ($1, $2, $3, $4, false, now(), now() + ($5 || ' seconds')::interval)`,
    [id, userId, code, purpose, String(OTP_TTL_SECONDS)],
  );
  const payload: Record<string, unknown> = {
    otp_required: true,
    challenge_id: id,
    message: OTP_DEBUG ? "OTP sent. Use 123456 in development." : "OTP sent.",
  };
  if (OTP_DEBUG) payload.debug_code = code;
  return payload;
}

authRoutes.post("/register/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const firstName = String(body.first_name ?? "").trim();
  const lastName = String(body.last_name ?? "").trim();
  const phone = String(body.phone ?? "");

  const errors: Record<string, string[]> = {};
  if (!email || !email.includes("@")) errors.email = ["Enter a valid email address."];
  if (password.length < 8) errors.password = ["Ensure this field has at least 8 characters."];
  if (!firstName) errors.first_name = ["This field is required."];
  if (!lastName) errors.last_name = ["This field is required."];
  if (Object.keys(errors).length) return respond(c, fieldError(errors));

  const lower = email.toLowerCase();
  const existing = await one<{ id: string }>(`select id from users_user where lower(email) = $1`, [lower]);
  if (existing) return respond(c, detail("Email already registered."));

  const id = crypto.randomUUID();
  await query(
    `insert into users_user (id, password, is_superuser, username, first_name, last_name, email,
                              is_staff, is_active, date_joined, phone, display_name, avatar_url, theme_preference, approval_status)
      values ($1, $2, false, $3, $4, $5, $3, false, false, now(), $6, $7, '', 'system', 'pending')`,
    [id, hashPassword(password), lower, firstName, lastName, phone, `${firstName} ${lastName}`.trim()],
  );

  const role = await one<{ id: string }>(`select id from roles_role where code = 'member'`);
  if (role) {
    await query(
      `insert into roles_userrole (id, user_id, role_id, assigned_at)
       values ($1, $2, $3, now()) on conflict (user_id, role_id) do nothing`,
      [crypto.randomUUID(), id, role.id],
    );
  }

  return c.json({ detail: "Registration submitted. An administrator must approve your account before you can sign in." }, 201);
});

authRoutes.post("/login/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  const errors: Record<string, string[]> = {};
  if (!email) errors.email = ["This field is required."];
  if (!password) errors.password = ["This field is required."];
  if (Object.keys(errors).length) return respond(c, fieldError(errors));

  const user = await one<{
    id: string;
    password: string;
    is_active: boolean; approval_status: string;
    username: string;
    email: string;
  }>(
    `select id, password, is_active, approval_status, username, email from users_user where lower(email) = $1 or lower(username) = $1`,
    [email],
  );

  if (!user || !verifyPassword(password, user.password)) {
    return respond(c, unauthorized("Invalid credentials."));
  }
  if (!user.is_active) {
    if (user.approval_status === "pending") return respond(c, detail("Your account is awaiting administrator approval.", 403));
    if (user.approval_status === "rejected") return respond(c, detail("Your registration was not approved. Contact support.", 403));
    return respond(c, unauthorized("Account is suspended. Contact support."));
  }
  await query(`update users_user set last_login = now() where id = $1`, [user.id]);
  return c.json(await issueOtp(user.id, "login"));
});

authRoutes.post("/otp/verify/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const challengeId = String(body.challenge_id ?? "");
  const code = String(body.code ?? "").trim();

  if (!UUID_RE.test(challengeId)) {
    return respond(c, detail("Invalid or expired challenge. Please sign in again."));
  }

  const challenge = await one<{
    id: string;
    user_id: string;
    code: string;
    is_used: boolean;
    expires_at: Date;
  }>(
    `select id, user_id, code, is_used, expires_at from users_otpchallenge where id = $1`,
    [challengeId],
  );
  if (!challenge) {
    return respond(c, detail("Invalid or expired challenge. Please sign in again."));
  }
  if (challenge.is_used || new Date(challenge.expires_at).getTime() < Date.now()) {
    return respond(c, detail("OTP expired. Please sign in again."));
  }
  if (challenge.code !== code) {
    return respond(c, detail("Invalid OTP."));
  }

  const user = await loadUser(challenge.user_id);
  if (!user) return respond(c, notFound());
  if (!user.is_active) {
    return respond(c, unauthorized("Account is suspended. Contact support."));
  }

  await query(`update users_otpchallenge set is_used = true where id = $1`, [challenge.id]);
  await query(`update users_user set last_login = now() where id = $1`, [user.id]);

  const tokens = await issueTokens(user.id);
  return c.json({ user: serializeUser(user), tokens });
});

authRoutes.post("/token/refresh/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const refresh = String(body.refresh ?? "");
  if (!refresh) return respond(c, fieldError({ refresh: ["This field is required."] }));
  const tokens = await rotateTokens(refresh);
  if (!tokens) {
    return respond(c, unauthorized("Token is invalid or expired."));
  }
  return c.json(tokens);
});

authRoutes.get("/me/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  return c.json(serializeUser(auth.user));
});

authRoutes.patch("/me/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

  const allowed = ["first_name", "last_name", "display_name", "phone", "avatar_url", "theme_preference"];
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const key of allowed) {
    if (key in body) {
      values.push(body[key] === null ? "" : String(body[key]));
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (sets.length) {
    values.push(auth.user.id);
    await query(`update users_user set ${sets.join(", ")} where id = $${values.length}`, values);
  }

  const user = await loadUser(auth.user.id);
  return c.json(serializeUser(user ?? auth.user));
});

authRoutes.post("/logout/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const refresh = body.refresh ? String(body.refresh) : null;
  if (refresh) await blacklistRefresh(refresh);
  return c.json({ detail: "Logged out." });
});
