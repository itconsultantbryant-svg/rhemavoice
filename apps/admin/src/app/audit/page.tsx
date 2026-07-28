"use client";

import { FadeIn } from "@rhemavoice/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export default function AuditPage() {
  const { api, user } = useAuth();
  const [logs, setLogs] = useState<Array<{ id: string; action: string; actor: string; created_at: string }>>([]);

  useEffect(() => {
    if (!user) return;
    api.admin.auditLogs().then(setLogs).catch(() => setLogs([]));
  }, [api, user]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <FadeIn>
        <Link href="/dashboard" className="text-sm text-[var(--rv-ink-muted)]">
          ← Dashboard
        </Link>
        <h1 className="font-display mt-4 text-3xl">Audit Logs</h1>
        <div className="rv-card mt-6 space-y-3">
          {logs.map((l) => (
            <div key={l.id} className="border-b border-[var(--rv-border)] pb-3 last:border-0">
              <p className="font-medium">{l.action}</p>
              <p className="text-xs text-[var(--rv-ink-muted)]">
                {l.actor} · {new Date(l.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </FadeIn>
    </main>
  );
}
