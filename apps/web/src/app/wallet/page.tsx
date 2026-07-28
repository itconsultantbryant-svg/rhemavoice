"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Transaction = {
  id: string;
  tx_type: string;
  amount_cents: number;
  balance_after_cents: number;
  description: string;
  reference: string;
  created_at: string;
};

type Wallet = {
  balance_cents: number;
  currency: string;
  recent_transactions: Transaction[];
};

type Provider = { id: string; key: string; name: string; supports_currency: string };

const money = (c: number) => `${c < 0 ? "-" : ""}$${(Math.abs(c) / 100).toFixed(2)}`;

const TX_LABELS: Record<string, string> = {
  topup: "Top Up",
  giving: "Giving",
  purchase: "Purchase",
  withdrawal: "Withdrawal",
  refund: "Refund",
  transfer_in: "Transfer In",
  transfer_out: "Transfer Out",
};

export default function WalletPage() {
  const { api, user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState("stripe");
  const [amount, setAmount] = useState("25.00");
  const [mode, setMode] = useState<"topup" | "give">("topup");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setWallet((await api.wallet.get()) as unknown as Wallet);
    const p = await api.payments.providers();
    setProviders(p);
    if (p[0] && !p.find((x) => x.key === provider)) setProvider(p[0].key);
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api]);

  async function submit() {
    const cents = Math.round(parseFloat(amount || "0") * 100);
    if (!cents || cents <= 0) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "topup") {
        const payment = await api.payments.initiate({
          amount_cents: cents,
          provider,
          purpose: "wallet_topup",
        });
        if (payment.sandbox) {
          await api.payments.confirm(String(payment.reference));
          setMessage(`Sandbox payment ${payment.reference} confirmed · ${money(cents)} added.`);
        } else {
          setMessage(`Checkout ready: ${payment.checkout_url || payment.reference}`);
        }
      } else {
        await api.wallet.give(cents, "Giving / offering");
        setMessage(`Thank you for your ${money(cents)} gift.`);
      }
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModuleShell moduleId="wallet" title="Wallet" description="Balance, giving, top-ups, and transaction history.">
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <section className="space-y-4">
            <div className="rv-card rv-gradient-brand p-6 text-white">
              <p className="text-sm opacity-80">Available balance</p>
              <p className="font-display mt-1 text-4xl">{wallet ? money(wallet.balance_cents) : "—"}</p>
              <p className="mt-1 text-sm opacity-80">{wallet?.currency || "USD"}</p>
            </div>

            <div className="rv-card p-5">
              <div className="mb-3 flex gap-2">
                <button className={mode === "topup" ? "rv-btn-primary" : "rv-btn-ghost"} onClick={() => setMode("topup")}>
                  Top up
                </button>
                <button className={mode === "give" ? "rv-btn-primary" : "rv-btn-ghost"} onClick={() => setMode("give")}>
                  Give
                </button>
              </div>
              <label className="text-sm text-[var(--rv-ink-muted)]">Amount (USD)</label>
              <input
                className="rv-input mt-1"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {mode === "topup" && (
                <>
                  <label className="mt-3 block text-sm text-[var(--rv-ink-muted)]">Provider</label>
                  <select className="rv-input mt-1" value={provider} onChange={(e) => setProvider(e.target.value)}>
                    {providers.map((p) => (
                      <option key={p.id} value={p.key}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <button className="rv-btn-primary mt-3 w-full" onClick={submit} disabled={busy}>
                {busy ? "Processing…" : mode === "topup" ? "Pay & add funds" : "Give now"}
              </button>
              {message && <p className="mt-3 text-sm text-gold-500">{message}</p>}
            </div>
          </section>

          <section className="rv-card p-5">
            <h2 className="font-display text-xl">Transactions</h2>
            <div className="mt-3 divide-y divide-[var(--rv-border)]">
              {wallet?.recent_transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{t.description || TX_LABELS[t.tx_type] || t.tx_type}</p>
                    <p className="text-xs text-[var(--rv-ink-muted)]">
                      {TX_LABELS[t.tx_type] || t.tx_type} · {t.reference}
                    </p>
                  </div>
                  <span className={`font-medium ${t.amount_cents < 0 ? "text-[var(--rv-ink-muted)]" : "text-gold-500"}`}>
                    {money(t.amount_cents)}
                  </span>
                </div>
              ))}
              {!wallet?.recent_transactions.length && (
                <p className="py-3 text-sm text-[var(--rv-ink-muted)]">No transactions yet.</p>
              )}
            </div>
          </section>
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
