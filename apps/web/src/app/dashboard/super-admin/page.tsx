"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

export default function SuperAdminDashboard() {
  const { api, user } = useAuth(); const [counts, setCounts] = useState({ users: 0, pending: 0, modules: 0 });
  useEffect(() => { if (!user) return; Promise.all([api.admin.users(), api.admin.modules()]).then(([users, modules]) => setCounts({ users: users.length, pending: users.filter((item) => (item as { approval_status?: string }).approval_status === "pending").length, modules: modules.length })).catch(() => undefined); }, [api, user]);
  return <AppShell><main className="mx-auto max-w-5xl px-4 py-6 md:px-6"><h1 className="font-display text-3xl">Super Admin Dashboard</h1><p className="mt-2 text-[var(--rv-ink-muted)]">Live platform oversight and account approvals.</p><div className="mt-6 grid gap-4 sm:grid-cols-3">{[["Users", counts.users], ["Pending approvals", counts.pending], ["Modules", counts.modules]].map(([label, value]) => <section className="rv-card p-5" key={String(label)}><p className="text-sm text-[var(--rv-ink-muted)]">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></section>)}</div><div className="mt-6 flex gap-3"><Link href="/profile" className="rv-btn-ghost">Profile</Link><Link href="/academy/chayil/cci/management" className="rv-btn-primary">Chayil management</Link></div></main></AppShell>;
}
