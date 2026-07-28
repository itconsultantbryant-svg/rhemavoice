"use client";

import { FadeIn } from "@rhemavoice/ui";
import { isSuperAdmin } from "@rhemavoice/shared";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export default function AdminLoginPage() {
  const { user, api, setSession, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("admin@rhemavoice.app");
  const [password, setPassword] = useState("Admin123!");
  const [code, setCode] = useState("123456");
  const [challenge, setChallenge] = useState("");
  const [step, setStep] = useState<"login" | "otp">("login");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.auth.logout().catch(() => undefined);
      const res = await api.auth.login(email, password);
      setChallenge(res.challenge_id);
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function onOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.auth.verifyOtp(challenge, code);
      if (!isSuperAdmin(res.user) && !res.user.roles.some((r) => String(r).includes("admin"))) {
        setError("This account is not an admin.");
        return;
      }
      setSession(res.user, res.tokens);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OTP failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <FadeIn>
        <Image
          src="/brand/rhemavoice_logo.jpeg"
          alt="RhemaVoice"
          width={72}
          height={72}
          className="rounded-full shadow-[0_0_24px_rgba(223,166,34,0.35)]"
          priority
        />
        <p className="mt-4 text-sm uppercase tracking-[0.28em] text-gold-500">RhemaVoice Admin</p>
        <h1 className="font-display mt-3 text-4xl">Master Console</h1>
        {step === "login" ? (
          <form onSubmit={onLogin} className="mt-8 space-y-3">
            <input className="rv-input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            <input className="rv-input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button className="rv-btn-primary w-full">Continue</button>
          </form>
        ) : (
          <form onSubmit={onOtp} className="mt-8 space-y-3">
            <input className="rv-input tracking-[0.35em] text-center text-xl" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button className="rv-btn-primary w-full">Verify</button>
          </form>
        )}
      </FadeIn>
    </main>
  );
}
