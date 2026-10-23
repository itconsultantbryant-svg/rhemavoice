import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Context } from "hono";
import { query, one } from "./db";
import { unauthorized, forbidden } from "./http";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "rhemavoice-dev-secret-change-me-in-production",
);

const ACCESS_TTL = 60 * 60; // 60 minutes, matches SIMPLE_JWT ACCESS_TOKEN_LIFETIME
const REFRESH_TTL = 60 * 60 * 24 * 7; // 7 days, matches SIMPLE_JWT REFRESH_TOKEN_LIFETIME

export type TokenType = "access" | "refresh";

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  phone: string;
  avatar_url: string;
  theme_preference: string;
  is_active: boolean;
  is_superuser: boolean;
  is_staff: boolean;
  date_joined: string;
  roles: string[];
};

async function sign(userId: string, type: TokenType, ttl: number): Promise<string> {
  return new SignJWT({ token_type: type, user_id: userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
    .setJti(crypto.randomUUID())
    .sign(SECRET);
}

export async function verifyToken(token: string, type: TokenType): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    if (payload.token_type !== type) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Issue an access + refresh pair and record the refresh token in the
 * outstanding-token table (mirrors SimpleJWT's OutstandingToken).
 */
export async function issueTokens(userId: string): Promise<{ access: string; refresh: string }> {
  const access = await sign(userId, "access", ACCESS_TTL);
  const refresh = await sign(userId, "refresh", REFRESH_TTL);
  await query(
    `insert into token_blacklist_outstandingtoken (token, created_at, expires_at, user_id, jti)
     values ($1, now(), now() + interval '7 days', $2, $3)`,
    [refresh, userId, crypto.randomUUID()],
  );
  return { access, refresh };
}

export async function blacklistRefresh(refresh: string): Promise<void> {
  const payload = await verifyToken(refresh, "refresh");
  if (!payload) return;
  await query(
    `insert into token_blacklist_blacklistedtoken (blacklisted_at, token_id)
     select now(), id from token_blacklist_outstandingtoken where token = $1
     on conflict (token_id) do nothing`,
    [refresh],
  );
}

/** Rotate a refresh token: blacklist the old one and issue a fresh pair. */
export async function rotateTokens(refresh: string): Promise<{ access: string; refresh: string } | null> {
  const payload = await verifyToken(refresh, "refresh");
  if (!payload?.user_id) return null;

  const blacklisted = await one<{ id: number }>(
    `select bt.id from token_blacklist_blacklistedtoken bt
       join token_blacklist_outstandingtoken ot on ot.id = bt.token_id
      where ot.token = $1`,
    [refresh],
  );
  if (blacklisted) return null;

  const user = await one<{ id: string; is_active: boolean }>(
    `select id, is_active from users_user where id = $1`,
    [payload.user_id],
  );
  if (!user || !user.is_active) return null;

  await blacklistRefresh(refresh);
  return issueTokens(user.id);
}

const USER_COLUMNS = `
  u.id, u.email, u.first_name, u.last_name, u.display_name, u.phone,
  u.avatar_url, u.theme_preference, u.is_active, u.is_superuser, u.is_staff,
  u.date_joined, u.last_login
`;

export async function loadUser(userId: string): Promise<AuthUser | null> {
  const row = await one<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    display_name: string;
    phone: string;
    avatar_url: string;
    theme_preference: string;
    is_active: boolean;
    is_superuser: boolean;
    is_staff: boolean;
    date_joined: Date;
    last_login: Date | null;
  }>(
    `select ${USER_COLUMNS} from users_user u where u.id = $1`,
    [userId],
  );
  if (!row) return null;
  const roles = await roleCodes(row.id);
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    display_name: row.display_name,
    phone: row.phone,
    avatar_url: row.avatar_url,
    theme_preference: row.theme_preference,
    is_active: row.is_active,
    is_superuser: row.is_superuser,
    is_staff: row.is_staff,
    date_joined: row.date_joined?.toISOString() ?? "",
    roles,
  };
}

export async function roleCodes(userId: string): Promise<string[]> {
  const rows = await query<{ code: string }>(
    `select r.code from roles_userrole ur join roles_role r on r.id = ur.role_id
      where ur.user_id = $1 order by r.code`,
    [userId],
  );
  return rows.map((r) => r.code);
}

export async function permissionCodes(userId: string): Promise<string[]> {
  const rows = await query<{ code: string }>(
    `select distinct p.code from roles_userrole ur
       join roles_role r on r.id = ur.role_id
       join roles_role_permissions rp on rp.role_id = r.id
       join roles_permission p on p.id = rp.permission_id
      where ur.user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.code);
}

export function bearerToken(c: Context): string | null {
  const header = c.req.header("Authorization") ?? c.req.header("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/**
 * Resolve the authenticated user for a request.
 * Returns `{ status: 401 }` style payloads so routers can `respond()` directly.
 */
export async function requireUser(
  c: Context,
): Promise<{ ok: true; user: AuthUser } | { ok: false; response: { status: number; body: unknown } }> {
  const token = bearerToken(c);
  if (!token) return { ok: false, response: unauthorized() };
  const payload = await verifyToken(token, "access");
  if (!payload?.user_id) return { ok: false, response: unauthorized("Token is invalid or expired.") };
  const user = await loadUser(String(payload.user_id));
  if (!user) return { ok: false, response: unauthorized("User not found.") };
  if (!user.is_active) return { ok: false, response: unauthorized("Account is suspended.") };
  return { ok: true, user };
}

export function isSuperAdmin(user: AuthUser): boolean {
  return user.is_superuser || user.roles.includes("super_admin");
}

/** Guard for the `/admin/*` surface (mirrors DRF's `IsSuperAdmin`). */
export function requireSuperAdmin(user: AuthUser): { status: number; body: unknown } | null {
  return isSuperAdmin(user) ? null : forbidden("Super admin access required.");
}

/** Guard for write operations on module-scoped routers (mirrors `IsModuleAdminOrReadOnly`). */
export function requireModuleAdmin(user: AuthUser): { status: number; body: unknown } | null {
  return isSuperAdmin(user) ? null : forbidden("Module admin access required.");
}
