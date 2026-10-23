import { Hono } from "hono";
import type { Context } from "hono";
import { one, query, tx, uuid } from "../db";
import { requireUser } from "../auth";
import { detail, respond } from "../http";
import { iso, num } from "../serializers";

export const walletRoutes = new Hono();

type WalletRow = {
  id: string;
  balance_cents: number;
  currency: string;
  created_at: Date;
};

type TransactionRow = {
  id: string;
  tx_type: string;
  amount_cents: number;
  balance_after_cents: number;
  description: string;
  reference: string;
  status: string;
  created_at: Date;
};

function serializeTransaction(row: TransactionRow) {
  return {
    id: row.id,
    tx_type: row.tx_type,
    amount_cents: num(row.amount_cents),
    balance_after_cents: num(row.balance_after_cents),
    description: row.description,
    reference: row.reference,
    status: row.status,
    created_at: iso(row.created_at) ?? "",
  };
}

function serializeWallet(wallet: WalletRow, recent: TransactionRow[]) {
  return {
    id: wallet.id,
    balance_cents: num(wallet.balance_cents),
    currency: wallet.currency,
    recent_transactions: recent.map(serializeTransaction),
    created_at: iso(wallet.created_at) ?? "",
  };
}

function parseAmount(value: unknown): number {
  if (value === undefined || value === null) return 0;
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

/** Django's `get_or_create(user=..., defaults={"currency": "USD"})`. */
async function getOrCreateWallet(userId: string): Promise<WalletRow> {
  await query(
    `insert into wallet_walletaccount (id, user_id, balance_cents, currency, created_at)
     values ($1, $2, 0, 'USD', now())
     on conflict (user_id) do nothing`,
    [uuid(), userId],
  );
  const wallet = await one<WalletRow>(
    `select id, balance_cents, currency, created_at
       from wallet_walletaccount where user_id = $1`,
    [userId],
  );
  if (!wallet) throw new Error("Wallet account could not be created.");
  return wallet;
}

async function walletTransactions(walletId: string, limit?: number): Promise<TransactionRow[]> {
  return query<TransactionRow>(
    `select id, tx_type, amount_cents, balance_after_cents, description, reference, status, created_at
       from wallet_transaction
      where wallet_id = $1
      order by created_at desc, id desc
      limit $2`,
    [walletId, limit ?? null],
  );
}

/** Mirrors Django's `_record`: locks the wallet, moves the balance, writes the row. */
async function record(
  walletId: string,
  txType: string,
  amountCents: number,
  description: string,
): Promise<TransactionRow> {
  const reference = `TX-${uuid().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  return tx(async (client) => {
    const locked = await client.query<{ balance_cents: number }>(
      `select balance_cents from wallet_walletaccount where id = $1 for update`,
      [walletId],
    );
    const balance = num(locked.rows[0]?.balance_cents) + amountCents;
    await client.query(`update wallet_walletaccount set balance_cents = $1 where id = $2`, [
      balance,
      walletId,
    ]);
    const created = await client.query<TransactionRow>(
      `insert into wallet_transaction
         (id, wallet_id, tx_type, amount_cents, balance_after_cents, description, reference, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'completed', now())
       returning id, tx_type, amount_cents, balance_after_cents, description, reference, status, created_at`,
      [uuid(), walletId, txType, amountCents, balance, description, reference],
    );
    return created.rows[0];
  });
}

const getWallet = async (c: Context) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const wallet = await getOrCreateWallet(auth.user.id);
  const recent = await walletTransactions(wallet.id, 10);
  return c.json(serializeWallet(wallet, recent));
};

walletRoutes.get("/", getWallet);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
walletRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return getWallet(c);
});

walletRoutes.get("/transactions/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const wallet = await getOrCreateWallet(auth.user.id);
  const rows = await walletTransactions(wallet.id);
  return c.json(rows.map(serializeTransaction));
});

walletRoutes.post("/topup/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const amount = parseAmount(body.amount_cents);
  if (amount <= 0) return respond(c, detail("Amount must be positive."));

  const description =
    body.description === undefined || body.description === null
      ? "Wallet top-up"
      : String(body.description);

  const wallet = await getOrCreateWallet(auth.user.id);
  const transaction = await record(wallet.id, "topup", amount, description);
  return c.json(serializeTransaction(transaction), 201);
});

walletRoutes.post("/give/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const amount = parseAmount(body.amount_cents);

  const wallet = await getOrCreateWallet(auth.user.id);
  if (amount <= 0) return respond(c, detail("Amount must be positive."));
  if (num(wallet.balance_cents) < amount) return respond(c, detail("Insufficient balance."));

  const description =
    body.description === undefined || body.description === null
      ? "Giving / offering"
      : String(body.description);

  const transaction = await record(wallet.id, "giving", -amount, description);
  return c.json(serializeTransaction(transaction), 201);
});
