import type { Context } from "hono";
import { query } from "./db";
import type { AuthUser } from "./auth";

/** Django's `UserSerializer` output shape (apps/users/serializers.py). */
export function serializeUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    first_name: user.first_name,
    last_name: user.last_name,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    roles: user.roles,
    theme_preference: user.theme_preference,
    is_active: user.is_active,
    date_joined: user.date_joined,
  };
}

export async function serializeUsers(userIds: string[]) {
  if (!userIds.length) return new Map<string, AuthUser>();
  const rows = await query<{
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
  }>(
    `select id, email, first_name, last_name, display_name, phone, avatar_url,
            theme_preference, is_active, is_superuser, is_staff, date_joined
       from users_user where id = any($1::uuid[])`,
    [userIds],
  );
  const map = new Map<string, AuthUser>();
  for (const row of rows) {
    map.set(row.id, {
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
      roles: [],
    });
  }
  return map;
}

/** ISO-8601 with microseconds, matching Django's `isoformat()` output. */
export function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

/** Normalise a jsonb column that may arrive as a string or an object. */
export function json(value: unknown): unknown {
  if (typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function bool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

export function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function str(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function optionalStr(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

export function bodyOf(c: Context): Record<string, unknown> {
  return (c.req.raw as { parsedBody?: Record<string, unknown> }).parsedBody ?? {};
}
