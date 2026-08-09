"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAuth } from "@/lib/auth";

export default function TogglesPage() {
  const { api, user } = useAuth();
  const [toggles, setToggles] = useState<Array<{ key: string; enabled: boolean; label: string }>>([]);

  useEffect(() => {
    if (!user) return;
    api.admin.toggles().then(setToggles).catch(() => setToggles([]));
  }, [api, user]);

  async function flip(key: string, enabled: boolean) {
    await api.admin.setToggle(key, !enabled);
    setToggles((prev) => prev.map((t) => (t.key === key ? { ...t, enabled: !enabled } : t)));
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
        <FadeIn>
          <h1 className="font-display text-3xl">Feature Toggles</h1>
          <div className="mt-6 space-y-3">
            {toggles.map((t) => (
              <button
                key={t.key}
                onClick={() => flip(t.key, t.enabled)}
                className="rv-card flex w-full items-center justify-between text-left"
              >
                <span>{t.label}</span>
                <span className={t.enabled ? "font-semibold text-green-400" : "text-[var(--rv-ink-muted)]"}>
                  {t.enabled ? "ON" : "OFF"}
                </span>
              </button>
            ))}
          </div>
        </FadeIn>
      </div>
    </AdminShell>
  );
}
