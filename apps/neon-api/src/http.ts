import type { Context } from "hono";

/** DRF-compatible error payloads. */
export function detail(message: string, status = 400) {
  return { status, body: { detail: message } } as const;
}

/** DRF's `NotFound.default_detail` is "Not found." (with the trailing period). */
export function notFound(message = "Not found.") {
  return detail(message, 404);
}

export function unauthorized(message = "Authentication credentials were not provided.") {
  return detail(message, 401);
}

export function forbidden(message = "You do not have permission to perform this action.") {
  return detail(message, 403);
}

export function fieldError(fields: Record<string, string[]>) {
  return { status: 400, body: fields } as const;
}

export function respond(c: Context, r: { status: number; body: unknown }) {
  return c.json(r.body as never, r.status as never);
}

/** DRF's default page size used by the paginated routers. */
export const PAGE_SIZE = 50;

/**
 * Normalise a DRF ListModelSerializer page into a plain array.
 *
 * The frontend's api-client expects bare arrays for most list endpoints, but
 * `/notifications/` returns `{results, unread_count}`. This helper lets a
 * router opt into the paginated envelope explicitly.
 */
export function asArray<T>(rows: T[]): T[] {
  return rows;
}
