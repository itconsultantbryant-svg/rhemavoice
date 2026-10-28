"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { RhemaLogo } from "@/components/Brand";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { api } = useAuth();
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", password: "" });
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setMessage(""); try { const result = await api.auth.register(form); setMessage(result.detail || "Registration submitted for approval."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit registration."); } finally { setBusy(false); } }
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12"><RhemaLogo size="lg" showWordmark href={undefined} /><h1 className="font-display mt-6 text-4xl">Create account</h1><p className="mt-2 text-sm text-[var(--rv-ink-muted)]">Your account becomes active after administrator approval.</p><form className="mt-7 space-y-3" onSubmit={submit}>{(["first_name", "last_name", "email", "phone", "password"] as const).map((field) => <input key={field} className="rv-input" required={field !== "phone"} type={field === "password" ? "password" : field === "email" ? "email" : "text"} placeholder={field.replace("_", " ")} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />)}<button className="rv-btn-primary w-full" disabled={busy}>{busy ? "Submitting…" : "Submit for approval"}</button></form>{message && <p className="mt-4 text-sm text-gold-500">{message}</p>}<Link className="mt-6 text-center text-sm text-[var(--rv-ink-muted)]" href="/login">Already have an account? Sign in</Link></main>;
}
