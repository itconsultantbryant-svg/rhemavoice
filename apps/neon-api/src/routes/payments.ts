import { Hono } from "hono";
import type { Context } from "hono";
import type { PoolClient } from "pg";
import { createHmac, timingSafeEqual } from "node:crypto";
import { one, query, tx, uuid } from "../db";
import { requireUser } from "../auth";
import { detail, notFound, respond } from "../http";
import { bool, iso, num } from "../serializers";

export const paymentsRoutes = new Hono();

type PaymentRow = {
  id: string;
  user_id: string | null;
  amount_cents: number;
  currency: string;
  provider: string;
  purpose: string;
  reference: string;
  status: string;
  checkout_url: string;
  client_secret: string;
  provider_reference: string;
  sandbox: boolean;
  created_at: Date;
};

type InitiateResult = {
  provider_reference: string;
  checkout_url: string;
  client_secret: string;
  sandbox: boolean;
};

const PAYMENT_COLUMNS = `
  id, user_id, amount_cents, currency, provider, purpose, reference, status,
  checkout_url, client_secret, provider_reference, sandbox, created_at`;

function serializePayment(row: PaymentRow) {
  return {
    id: row.id,
    amount_cents: num(row.amount_cents),
    currency: row.currency,
    provider: row.provider,
    purpose: row.purpose,
    reference: row.reference,
    status: row.status,
    checkout_url: row.checkout_url,
    provider_reference: row.provider_reference,
    sandbox: bool(row.sandbox),
    created_at: iso(row.created_at) ?? "",
  };
}

function parseAmount(value: unknown): number {
  if (value === undefined || value === null) return 0;
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function env(key: string): string {
  return process.env[key] ?? "";
}

/** Mirrors `gateway.is_sandbox`: sandbox unless live mode has the provider key. */
function isSandbox(provider: string): boolean {
  const mode = (env("PAYMENTS_MODE") || "sandbox").toLowerCase();
  if (mode !== "live") return true;
  const keys: Record<string, string> = {
    stripe: env("STRIPE_SECRET_KEY"),
    paystack: env("PAYSTACK_SECRET_KEY"),
    flutterwave: env("FLUTTERWAVE_SECRET_KEY"),
    mobile_money: env("MOBILE_MONEY_API_KEY"),
  };
  return !keys[provider];
}

function initiatePayment(opts: {
  provider: string;
  amountCents: number;
  currency: string;
  reference: string;
  email: string;
  purpose: string;
  callbackBase: string;
}): InitiateResult {
  const provider = (opts.provider || "stripe").toLowerCase();
  const sandbox = isSandbox(provider);
  const clientSecret = `cs_${uuid().replace(/-/g, "")}`;
  const providerRef = `${provider.toUpperCase()}-${uuid().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

  if (sandbox) {
    return {
      provider_reference: providerRef,
      checkout_url: `${opts.callbackBase}/payments/sandbox/confirm/?reference=${opts.reference}&provider=${provider}`,
      client_secret: clientSecret,
      sandbox: true,
    };
  }

  if (provider === "stripe") {
    return {
      provider_reference: providerRef,
      checkout_url: `https://checkout.stripe.com/c/pay/${providerRef}`,
      client_secret: clientSecret,
      sandbox: false,
    };
  }

  if (provider === "paystack") {
    return {
      provider_reference: providerRef,
      checkout_url: `https://checkout.paystack.com/${providerRef}`,
      client_secret: clientSecret,
      sandbox: false,
    };
  }

  if (provider === "flutterwave") {
    return {
      provider_reference: providerRef,
      checkout_url: `https://checkout.flutterwave.com/v3/${providerRef}`,
      client_secret: clientSecret,
      sandbox: false,
    };
  }

  return {
    provider_reference: providerRef,
    checkout_url: `${opts.callbackBase}/payments/sandbox/confirm/?reference=${opts.reference}&provider=${provider}`,
    client_secret: clientSecret,
    sandbox: true,
  };
}

function verifyWebhookSignature(provider: string, payload: string, signature: string): boolean {
  if (isSandbox(provider)) return true;
  const secrets: Record<string, string> = {
    stripe: env("STRIPE_WEBHOOK_SECRET"),
    paystack: env("PAYSTACK_SECRET_KEY"),
    flutterwave: env("FLUTTERWAVE_WEBHOOK_SECRET"),
    mobile_money: env("MOBILE_MONEY_WEBHOOK_SECRET"),
  };
  const secret = secrets[provider] ?? "";
  if (!secret) return false;
  const digest = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  const expected = Buffer.from(digest, "utf8");
  const given = Buffer.from(signature || "", "utf8");
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

/** Mirrors Django's `_credit_wallet`: locks the wallet, moves the balance, writes the row. */
async function creditWallet(
  client: PoolClient,
  userId: string,
  amountCents: number,
  description: string,
  reference: string,
): Promise<void> {
  await client.query(
    `insert into wallet_walletaccount (id, user_id, balance_cents, currency, created_at)
     values ($1, $2, 0, 'USD', now())
     on conflict (user_id) do nothing`,
    [uuid(), userId],
  );
  const locked = await client.query<{ id: string; balance_cents: number }>(
    `select id, balance_cents from wallet_walletaccount where user_id = $1 for update`,
    [userId],
  );
  const wallet = locked.rows[0];
  const balance = num(wallet?.balance_cents) + amountCents;
  await client.query(`update wallet_walletaccount set balance_cents = $1 where id = $2`, [
    balance,
    wallet?.id,
  ]);
  await client.query(
    `insert into wallet_transaction
       (id, wallet_id, tx_type, amount_cents, balance_after_cents, description, reference, status, created_at)
     values ($1, $2, 'topup', $3, $4, $5, $6, 'completed', now())`,
    [uuid(), wallet?.id, amountCents, balance, description, reference],
  );
}

function notificationBody(payment: PaymentRow): string {
  return `${payment.reference} · $${(num(payment.amount_cents) / 100).toFixed(2)} via ${payment.provider}`;
}

/** Mirrors Django's `_complete_payment`. */
async function completePayment(payment: PaymentRow): Promise<PaymentRow> {
  if (payment.status === "succeeded") return payment;

  const purpose = (payment.purpose || "").toLowerCase();
  const creditsWallet =
    purpose.includes("wallet") || purpose.includes("topup") || purpose.includes("top-up");

  await tx(async (client) => {
    await client.query(`update payments_payment set status = 'succeeded' where id = $1`, [
      payment.id,
    ]);
    // A payment without a user has no wallet to credit, so the top-up is skipped.
    if (creditsWallet && payment.user_id) {
      await creditWallet(
        client,
        payment.user_id,
        num(payment.amount_cents),
        `Payment top-up via ${payment.provider}`,
        payment.reference,
      );
    }
  });

  if (payment.user_id) {
    await query(
      `insert into notifications_notification
         (id, user_id, title, body, channel, category, action_url, is_read, created_at)
       values ($1, $2, 'Payment successful', $3, 'in_app', 'wallet', '/wallet', false, now())`,
      [uuid(), payment.user_id, notificationBody(payment)],
    );
  }

  return { ...payment, status: "succeeded" };
}

function dig(payload: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = payload;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

const listPayments = async (c: Context) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<PaymentRow>(
    `select ${PAYMENT_COLUMNS} from payments_payment
      where user_id = $1
      order by created_at desc, id desc`,
    [auth.user.id],
  );
  return c.json(rows.map(serializePayment));
};

paymentsRoutes.get("/", listPayments);

// Hono's path merge drops a router root's trailing slash when the router is
// mounted without one, so the root listing is served from the wildcard too.
paymentsRoutes.get("*", async (c, next) => {
  const mount = c.req.routePath.replace(/\/?\*$/, "");
  if (c.req.path !== `${mount}/`) {
    await next();
    return;
  }
  return listPayments(c);
});

paymentsRoutes.get("/providers/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<{
    id: string;
    key: string;
    name: string;
    is_active: boolean;
    supports_currency: string;
  }>(
    `select id, key, name, is_active, supports_currency
       from payments_paymentprovider
      where is_active = true
      order by key`,
  );

  return c.json(
    rows.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      is_active: bool(r.is_active),
      supports_currency: r.supports_currency,
    })),
  );
});

paymentsRoutes.post("/initiate/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);
  const user = auth.user;

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const amount = parseAmount(body.amount_cents);
  if (amount <= 0) return respond(c, detail("Amount must be positive."));

  const provider =
    body.provider === undefined || body.provider === null ? "stripe" : String(body.provider);
  const currency =
    body.currency === undefined || body.currency === null ? "USD" : String(body.currency);
  const purpose =
    body.purpose === undefined || body.purpose === null ? "" : String(body.purpose);

  const reference = `PAY-${uuid().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const callbackBase = `${new URL(c.req.url).origin}/api/v1`;

  const result = initiatePayment({
    provider,
    amountCents: amount,
    currency,
    reference,
    email: user.email,
    purpose,
    callbackBase,
  });

  const created = await one<PaymentRow>(
    `insert into payments_payment
       (id, user_id, amount_cents, currency, provider, purpose, reference, status,
        checkout_url, client_secret, provider_reference, sandbox, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, 'initiated', $8, $9, $10, $11, now())
     returning ${PAYMENT_COLUMNS}`,
    [
      uuid(),
      user.id,
      amount,
      currency,
      provider,
      purpose,
      reference,
      result.checkout_url,
      result.client_secret,
      result.provider_reference,
      result.sandbox,
    ],
  );
  if (!created) return respond(c, detail("Payment could not be created."));

  return c.json({ ...serializePayment(created), client_secret: result.client_secret }, 201);
});

paymentsRoutes.post("/confirm/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const reference =
    body.reference === undefined || body.reference === null ? "" : String(body.reference);

  const payment = await one<PaymentRow>(
    `select ${PAYMENT_COLUMNS} from payments_payment where reference = $1 and user_id = $2`,
    [reference, auth.user.id],
  );
  if (!payment) return respond(c, notFound("Payment not found."));

  const completed = await completePayment(payment);
  return c.json(serializePayment(completed));
});

// Django marks the sandbox confirmation as AllowAny: the provider redirects the
// browser here straight from the checkout URL, without an API token.
const sandboxConfirm = async (c: Context) => {
  const raw = await c.req.text();
  let body: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    /* an empty or non-JSON body is treated as an empty payload */
  }

  const fromQuery = c.req.query("reference");
  const reference =
    fromQuery || (body.reference === undefined || body.reference === null ? "" : String(body.reference));

  const payment = await one<PaymentRow>(
    `select ${PAYMENT_COLUMNS} from payments_payment where reference = $1`,
    [reference],
  );
  if (!payment) return respond(c, notFound("Payment not found."));

  const completed = await completePayment(payment);
  return c.json({ detail: "Sandbox payment confirmed.", payment: serializePayment(completed) });
};

paymentsRoutes.get("/sandbox/confirm/", sandboxConfirm);
paymentsRoutes.post("/sandbox/confirm/", sandboxConfirm);

// Django marks the webhook as AllowAny: the provider calls it server to server.
paymentsRoutes.post("/webhooks/:provider/", async (c) => {
  const provider = c.req.param("provider");
  const raw = await c.req.text();

  const signature =
    c.req.header("X-Signature") ??
    c.req.header("X-Paystack-Signature") ??
    c.req.header("Stripe-Signature") ??
    "";
  if (!verifyWebhookSignature(provider, raw, signature)) {
    return respond(c, detail("Invalid signature", 400));
  }

  let payload: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed as Record<string, unknown>;
    }
  } catch {
    /* a non-JSON payload carries no reference */
  }

  const reference =
    dig(payload, ["reference"]) ||
    dig(payload, ["data", "reference"]) ||
    dig(payload, ["data", "metadata", "reference"]);
  if (!reference) return respond(c, detail("reference missing", 400));

  const payment = await one<PaymentRow>(
    `select ${PAYMENT_COLUMNS} from payments_payment where reference = $1`,
    [String(reference)],
  );
  if (!payment) return respond(c, notFound("Payment not found."));

  const event = String(payload.event || payload.type || "success").toLowerCase();
  if (event.includes("fail")) {
    await query(`update payments_payment set status = 'failed' where id = $1`, [payment.id]);
    return c.json({ detail: "Marked failed" });
  }

  const completed = await completePayment(payment);
  return c.json({ detail: "ok", status: completed.status });
});
