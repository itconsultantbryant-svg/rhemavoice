import { Hono } from "hono";
import type { Context } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { fieldError, respond } from "../http";
import { bool, iso, json } from "../serializers";

export const settingsRoutes = new Hono();

type PreferenceRow = {
  id: string;
  key: string;
  value: unknown;
  notify_email: boolean;
  notify_push: boolean;
  notify_sms: boolean;
  language: string;
  updated_at: Date;
};

const PREFERENCE_COLUMNS = `
  id, key, value, notify_email, notify_push, notify_sms, language, updated_at`;

function serializePreference(row: PreferenceRow) {
  return {
    id: row.id,
    key: row.key,
    value: json(row.value) ?? {},
    notify_email: bool(row.notify_email),
    notify_push: bool(row.notify_push),
    notify_sms: bool(row.notify_sms),
    language: row.language,
    updated_at: iso(row.updated_at) ?? "",
  };
}

const TRUE_VALUES = new Set<unknown>([
  "t",
  "T",
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "true",
  "True",
  "TRUE",
  "on",
  "On",
  "ON",
  "1",
  1,
  true,
]);

const FALSE_VALUES = new Set<unknown>([
  "f",
  "F",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "false",
  "False",
  "FALSE",
  "off",
  "Off",
  "OFF",
  "0",
  0,
  false,
]);

function parseBoolean(value: unknown): boolean | null {
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;
  return null;
}

async function loadPreference(userId: string): Promise<PreferenceRow> {
  const existing = await one<PreferenceRow>(
    `select ${PREFERENCE_COLUMNS} from settings_app_userpreference where user_id = $1`,
    [userId],
  );
  if (existing) return existing;

  await query(
    `insert into settings_app_userpreference
       (id, user_id, key, value, notify_email, notify_push, notify_sms, language, created_at, updated_at)
     values ($1, $2, 'defaults', '{}'::jsonb, true, true, false, 'en', now(), now())
     on conflict (user_id) do nothing`,
    [uuid(), userId],
  );

  const row = await one<PreferenceRow>(
    `select ${PREFERENCE_COLUMNS} from settings_app_userpreference where user_id = $1`,
    [userId],
  );
  return row as PreferenceRow;
}

async function updatePreferences(c: Context) {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const raw = await c.req.json().catch(() => null);
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return respond(c, fieldError({ non_field_errors: ["Invalid data. Expected a dictionary."] }));
  }
  const body = raw as Record<string, unknown>;

  const errors: Record<string, string[]> = {};
  const sets: string[] = [];
  const values: unknown[] = [];

  if ("key" in body) {
    const value = body.key;
    if (value === null) {
      errors.key = ["This field may not be null."];
    } else if (typeof value !== "string") {
      errors.key = ["Not a valid string."];
    } else if (value.length > 80) {
      errors.key = ["Ensure this field has no more than 80 characters."];
    } else {
      values.push(value);
      sets.push(`key = $${values.length}`);
    }
  }

  if ("value" in body) {
    const value = body.value;
    if (value === null) {
      errors.value = ["This field may not be null."];
    } else if (
      typeof value === "object" ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      values.push(JSON.stringify(value));
      sets.push(`value = $${values.length}::jsonb`);
    } else {
      errors.value = ["Value must be valid JSON."];
    }
  }

  for (const field of ["notify_email", "notify_push", "notify_sms"]) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value === null) {
      errors[field] = ["This field may not be null."];
      continue;
    }
    const parsed = parseBoolean(value);
    if (parsed === null) {
      errors[field] = ["Must be a valid boolean."];
      continue;
    }
    values.push(parsed);
    sets.push(`${field} = $${values.length}`);
  }

  if ("language" in body) {
    const value = body.language;
    if (value === null) {
      errors.language = ["This field may not be null."];
    } else if (typeof value !== "string") {
      errors.language = ["Not a valid string."];
    } else if (value.length > 16) {
      errors.language = ["Ensure this field has no more than 16 characters."];
    } else {
      values.push(value);
      sets.push(`language = $${values.length}`);
    }
  }

  if (Object.keys(errors).length) return respond(c, fieldError(errors));

  const pref = await loadPreference(auth.user.id);
  values.push(pref.id);
  await query(
    `update settings_app_userpreference set ${sets.length ? `${sets.join(", ")}, ` : ""}updated_at = now()
      where id = $${values.length}`,
    values,
  );

  const updated = await one<PreferenceRow>(
    `select ${PREFERENCE_COLUMNS} from settings_app_userpreference where id = $1`,
    [pref.id],
  );
  return c.json(serializePreference(updated ?? pref));
}

settingsRoutes.get("/preferences/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const pref = await loadPreference(auth.user.id);
  return c.json(serializePreference(pref));
});

settingsRoutes.put("/preferences/", updatePreferences);
settingsRoutes.patch("/preferences/", updatePreferences);
