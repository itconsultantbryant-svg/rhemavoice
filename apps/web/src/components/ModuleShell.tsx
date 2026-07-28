"use client";

import { FadeIn } from "@rhemavoice/ui";
import type { ModuleId, ModuleMeta } from "@rhemavoice/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { RhemaLogo } from "@/components/Brand";
import { useAuth } from "@/lib/auth";

const PROFILE_FIELDS: Record<string, string[]> = {
  academy: ["Education Level", "Country", "Church", "Occupation", "Learning Goals", "Phone", "Gender", "Age"],
  learn: ["Learning Interests", "Country", "Language", "Phone", "Goals"],
  business: ["Business Name", "Category", "Country", "Phone", "Website"],
  opportunities: ["Seeking / Hiring", "Industry", "Country", "Phone", "Experience Level"],
  rooms: ["Display Name", "Country", "Interests", "Phone"],
};

export function ModuleShell({
  moduleId,
  title,
  description,
  children,
}: {
  moduleId: ModuleId | string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { user, api, loading } = useAuth();
  const router = useRouter();
  const [meta, setMeta] = useState<ModuleMeta | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.modules.list().then((list) => {
      const m = list.find((x) => x.id === moduleId) || null;
      setMeta(m);
      setNeedsProfile(!!m?.requires_profile && !m.profile_complete);
    });
  }, [user, api, moduleId]);

  async function submitProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.modules.saveProfile(moduleId, { ...form, accepted_terms: true });
      setNeedsProfile(false);
    } finally {
      setBusy(false);
    }
  }

  if (!user || !meta) {
    return <main className="grid min-h-screen place-items-center text-[var(--rv-ink-muted)]">Opening module…</main>;
  }

  if (needsProfile) {
    const fields = PROFILE_FIELDS[moduleId] || ["Full Name", "Country", "Phone"];
    return (
      <main className="mx-auto max-w-lg px-6 py-12">
        <FadeIn>
          <Link href="/dashboard" className="text-sm text-[var(--rv-ink-muted)]">
            ← Dashboard
          </Link>
          <h1 className="font-display mt-4 text-3xl">Complete {title} Registration</h1>
          <p className="mt-2 text-[var(--rv-ink-muted)]">Finish your module profile to continue.</p>
          <form onSubmit={submitProfile} className="mt-8 space-y-3">
            {fields.map((label) => {
              const key = label.toLowerCase().replace(/\s+/g, "_");
              return (
                <input
                  key={key}
                  className="rv-input"
                  placeholder={label}
                  required
                  value={form[key] || ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              );
            })}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" required /> Accept Terms
            </label>
            <button className="rv-btn-primary w-full" disabled={busy}>
              {busy ? "Saving…" : "Continue"}
            </button>
          </form>
        </FadeIn>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <FadeIn>
        <div className="mb-6 flex items-center gap-3">
          <RhemaLogo size="sm" href="/dashboard" />
          <Link href="/dashboard" className="text-sm text-[var(--rv-ink-muted)]">
            ← Dashboard
          </Link>
        </div>
        <p className="text-sm uppercase tracking-[0.22em] text-gold-500">RhemaVoice</p>
        <h1 className="font-display mt-2 text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-[var(--rv-ink-muted)]">{description}</p>
        <div className="mt-8">{children}</div>
      </FadeIn>
    </main>
  );
}
