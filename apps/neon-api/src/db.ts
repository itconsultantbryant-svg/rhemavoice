import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { attachDatabasePool } from "@neon/functions";

/**
 * Neon injects `DATABASE_URL` (pooled, PgBouncer) and `DATABASE_URL_UNPOOLED`
 * (direct) into the function runtime at request time.
 */
const connectionString = process.env.DATABASE_URL ?? "";

export const pool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  ssl: connectionString ? { rejectUnauthorized: false } : undefined,
});

// Without this, node-postgres emits an unhandled 'error' event and kills the isolate.
attachDatabasePool(pool);

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await pool.query<T>(text, params as never[]);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length ? rows[0] : null;
}

export async function count(text: string, params: unknown[] = []): Promise<number> {
  const rows = await query<{ n: string }>(text, params);
  return Number(rows[0]?.n ?? 0);
}

export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  } finally {
    client.release();
  }
}

export function uuid(): string {
  return globalThis.crypto.randomUUID();
}
