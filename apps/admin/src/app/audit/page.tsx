"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAuth } from "@/lib/auth";

export default function AuditPage() {
  const { api, user } = useAuth();
  const [logs, setLogs] = useState<Array<{ id: string; action: string; actor: string; created_at: string }>>([]);

  useEffect(() => {
    if (!user) return;
    api.admin.auditLogs().then(setLogs).catch(() => setLogs([]));
  }, [api, user]);

  return (
    <AdminShell>
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
        <FadeIn>
          <h1 className="font-display text-3xl">Audit Logs</h1>
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
      </div>
    </AdminShell>
  );
}
