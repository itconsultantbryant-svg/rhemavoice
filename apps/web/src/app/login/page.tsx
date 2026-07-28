"use client";

import { FadeIn } from "@rhemavoice/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { RhemaLogo } from "@/components/Brand";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { api } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("demo@rhemavoice.app");
  const [password, setPassword] = useState("Demo123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // Drop stale session before a fresh login so OTP challenge isn't mixed with old tokens.
      await api.auth.logout().catch(() => undefined);
      const res = await api.auth.login(email, password);
      sessionStorage.setItem("rv_challenge", res.challenge_id);
      sessionStorage.setItem("rv_login_email", email);
      router.push("/otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <FadeIn>
        <RhemaLogo size="lg" showWordmark priority href={undefined} />
        <h1 className="font-display mt-6 text-4xl">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">One account. Every module.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <input className="rv-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
          <input
            className="rv-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          {error && <p className="text-sm text-[var(--rv-danger)]">{error}</p>}
          <button className="rv-btn-primary w-full" disabled={busy}>
            {busy ? "Sending OTP…" : "Continue"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--rv-ink-muted)]">
          Dev OTP is <span className="font-semibold text-gold-500">123456</span>
        </p>
        <Link href="/welcome" className="mt-4 block text-center text-sm text-[var(--rv-ink-muted)]">
          Back
        </Link>
      </FadeIn>
    </main>
  );
}
