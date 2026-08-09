"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAuth } from "@/lib/auth";

export default function RolesPage() {
  const { api, user } = useAuth();
  const [roles, setRoles] = useState<Array<{ id: string; name: string; permissions: string[] }>>([]);

  useEffect(() => {
    if (!user) return;
    api.admin.roles().then(setRoles).catch(() => setRoles([]));
  }, [api, user]);

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <FadeIn>
          <h1 className="font-display text-3xl">Roles & Permissions</h1>
          <div className="mt-6 grid gap-3">
            {roles.map((r) => (
              <div key={r.id} className="rv-card">
                <h2 className="font-display text-xl">{r.name}</h2>
                <p className="mt-2 text-xs text-[var(--rv-ink-muted)]">{r.permissions.join(" · ") || "No permissions assigned"}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </AdminShell>
  );
}
