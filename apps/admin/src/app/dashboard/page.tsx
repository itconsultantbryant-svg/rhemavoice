"use client";

import { FadeIn } from "@rhemavoice/ui";
import { isSuperAdmin } from "@rhemavoice/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/users", label: "Users" },
  { href: "/roles", label: "Roles" },
  { href: "/toggles", label: "Feature Toggles" },
  { href: "/audit", label: "Audit Logs" },
  { href: "/modules/streaming", label: "Streaming" },
  { href: "/modules/academy", label: "Academy" },
  { href: "/modules/learn", label: "Learn" },
  { href: "/modules/radio", label: "Radio" },
  { href: "/modules/business", label: "Business" },
  { href: "/modules/rooms", label: "Rooms" },
  { href: "/modules/opportunities", label: "Opportunities" },
  { href: "/modules/transport", label: "Transport" },
  { href: "/modules/ticketing", label: "E-Ticketing" },
  { href: "/modules/air", label: "RhemaAir" },
];

export default function AdminDashboard() {
  const { user, api, loading, logout } = useAuth();
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
    <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-8 md:px-6">
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="mb-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/rhemavoice_logo.jpeg" alt="" className="h-10 w-10 rounded-full object-cover" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gold-500">Super Admin</p>
            <h1 className="font-display text-xl">RhemaVoice</h1>
          </div>
        </div>
        <nav className="mt-6 space-y-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-navy-900/5">
              {item.label}
            </Link>
          ))}
        </nav>
        <button className="mt-8 text-sm text-[var(--rv-ink-muted)]" onClick={() => logout().then(() => router.replace("/"))}>
          Log out
        </button>
      </aside>
      <main className="flex-1">
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
      </main>
    </div>
  );
}
