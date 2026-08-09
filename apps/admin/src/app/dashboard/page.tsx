"use client";

import { FadeIn } from "@rhemavoice/ui";
import { isSuperAdmin } from "@rhemavoice/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAuth } from "@/lib/auth";

export default function AdminDashboard() {
  const { user, api, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ users: 0, roles: 0, logs: 0 });

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !isSuperAdmin(user)) return;
    Promise.all([api.admin.users(), api.admin.roles(), api.admin.auditLogs()]).then(([u, r, l]) => {
      setStats({ users: u.length, roles: r.length, logs: l.length });
    });
  }, [user, api]);

  if (!user) return null;

  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <FadeIn>
          <h2 className="font-display text-3xl">Master Dashboard</h2>
          <p className="mt-1 text-[var(--rv-ink-muted)]">Signed in as {user.email}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rv-card">
              <p className="text-sm text-[var(--rv-ink-muted)]">Users</p>
              <p className="font-display mt-2 text-3xl">{stats.users}</p>
            </div>
            <div className="rv-card">
              <p className="text-sm text-[var(--rv-ink-muted)]">Roles</p>
              <p className="font-display mt-2 text-3xl">{stats.roles}</p>
            </div>
            <div className="rv-card">
              <p className="text-sm text-[var(--rv-ink-muted)]">Audit events</p>
              <p className="font-display mt-2 text-3xl">{stats.logs}</p>
            </div>
          </div>
          <div className="rv-card mt-6">
            <h3 className="font-display text-xl">Capabilities</h3>
            <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">
              Manage admins, roles, modules, payments, churches, courses, streams, rooms, reports, feature toggles,
              maintenance mode, and audit logs from this console.
            </p>
          </div>
        </FadeIn>
      </div>
    </AdminShell>
  );
}
