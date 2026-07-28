"use client";

import { FadeIn } from "@rhemavoice/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { RhemaLogo } from "@/components/Brand";
import { useAuth } from "@/lib/auth";

export default function OtpPage() {
  const { api, setSession } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("123456");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [challengeId, setChallengeId] = useState("");

  useEffect(() => {
    const id = sessionStorage.getItem("rv_challenge") || "";
    setChallengeId(id);
    if (!id) setError("Missing challenge. Please sign in again.");
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!challengeId) {
      setError("Missing challenge. Please sign in again.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.auth.verifyOtp(challengeId, code.trim());
      sessionStorage.removeItem("rv_challenge");
      setSession(res.user, res.tokens);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <FadeIn>
        <RhemaLogo size="md" showWordmark href={undefined} />
        <p className="mt-6 text-sm uppercase tracking-[0.28em] text-gold-500">Verification</p>
        <h1 className="font-display mt-2 text-4xl">Enter OTP</h1>
        <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">
          Dev code is <span className="font-semibold text-gold-500">123456</span>
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input
            className="rv-input tracking-[0.4em] text-center text-2xl"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            inputMode="numeric"
            required
          />
          {error && <p className="text-sm text-[var(--rv-danger)]">{error}</p>}
          <button className="rv-btn-primary w-full" disabled={busy || !challengeId}>
            {busy ? "Verifying…" : "Verify & enter"}
          </button>
        </form>
        <Link href="/login" className="mt-6 block text-center text-sm text-[var(--rv-ink-muted)]">
          ← Back to sign in
        </Link>
      </FadeIn>
    </main>
  );
}
