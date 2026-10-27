"use client";

import Link from "next/link";
import { Bell, ClipboardList, GraduationCap, Heart, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

type Task = { id: string; title: string; status: string; due_at: string | null };
type Center = {
  roles: string[]; can_manage: boolean;
  readiness: { total_tasks: number; open_tasks: number; completed_tasks: number };
  tasks: Task[];
  announcements: Array<{ id: string; title: string; body: string; audience: string }>;
  integration_status: Record<string, string>;
};

export default function CCICommandCenterPage() {
  const { code } = useParams<{ code: string }>();
  const { api, user, loading } = useAuth();
  const router = useRouter();
  const [center, setCenter] = useState<Center | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");

  async function load() {
    if (!user) return;
    try { setCenter(await api.academy.cciCommandCenter(code) as unknown as Center); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load CCI."); }
  }
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user, api, code]);
  async function update(task: Task, status: string) { await api.academy.updateCciTaskStatus(code, task.id, status); await load(); }
  async function create(e: React.FormEvent) {
    e.preventDefault(); if (!title.trim()) return;
    await api.academy.createCciTask(code, { title }); setTitle(""); await load();
  }

  return <AppShell><main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
    <Link href={`/academy/${code}`} aria-label="Back to RhemaAcademy" className="text-sm text-[var(--rv-ink-muted)]">← Academy</Link>
    <div className="mt-4 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-500"><GraduationCap className="h-6 w-6" /></span><div><h1 className="font-display text-3xl">CCI</h1><p className="text-xs uppercase tracking-[0.16em] text-[var(--rv-ink-muted)]">Command Center</p></div></div>
    {error && <p className="mt-6 rounded-xl border border-[var(--rv-danger)]/40 p-4 text-sm text-[var(--rv-danger)]">{error}</p>}
    {!center && !error && <p className="mt-6 text-sm text-[var(--rv-ink-muted)]">Loading authorized program data…</p>}
    {center && <div className="mt-6 space-y-6">
       <section className="grid gap-3 sm:grid-cols-3"><div className="rv-card flex items-center gap-3 p-4"><ClipboardList className="h-5 w-5 text-gold-500"/><div><p className="text-xs text-[var(--rv-ink-muted)]">Open</p><p className="font-display text-lg text-gold-500">{center.readiness.open_tasks}</p></div></div><div className="rv-card flex items-center gap-3 p-4"><Heart className="h-5 w-5 text-gold-500"/><div><p className="text-xs text-[var(--rv-ink-muted)]">Done</p><p className="font-display text-lg text-gold-500">{center.readiness.completed_tasks}</p></div></div><div className="rv-card flex items-center gap-3 p-4"><Users className="h-5 w-5 text-gold-500"/><div><p className="text-xs text-[var(--rv-ink-muted)]">Role</p><p className="font-display text-lg text-gold-500">{center.roles.join(", ") || "Participant"}</p></div></div></section>
       <section className="rv-card p-5"><h2 className="flex items-center gap-2 font-display text-xl"><Bell className="h-5 w-5 text-gold-500"/>Updates</h2><div className="mt-3 space-y-3">{center.announcements.map((a) => <article key={a.id} className="border-b border-[var(--rv-border)] pb-3 last:border-0"><p className="font-medium">{a.title}</p><p className="mt-1 line-clamp-2 text-sm text-[var(--rv-ink-muted)]">{a.body}</p></article>)}{!center.announcements.length && <p className="text-sm text-[var(--rv-ink-muted)]">Nothing new.</p>}</div></section>
       <section className="rv-card p-5"><h2 className="flex items-center gap-2 font-display text-xl"><ClipboardList className="h-5 w-5 text-gold-500"/>Tasks</h2><div className="mt-3 space-y-2">{center.tasks.map((task) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--rv-border)] p-3" key={task.id}><div><p className="font-medium">{task.title}</p>{task.due_at && <p className="text-xs text-[var(--rv-ink-muted)]">{new Date(task.due_at).toLocaleDateString()}</p>}</div><select aria-label={`Status for ${task.title}`} value={task.status} onChange={(e) => update(task, e.target.value)} className="rv-input w-auto py-1 text-sm"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>)}{!center.tasks.length && <p className="text-sm text-[var(--rv-ink-muted)]">All clear.</p>}</div></section>
      <div className="flex flex-wrap gap-3"><Link className="rv-btn-ghost self-center" href={`/academy/${code}/cci/bonding`}>Bonding Corner</Link><Link className="rv-btn-ghost self-center" href={`/academy/${code}/cci/gradebook`}>{["founder", "program_director", "curriculum_director", "instructor"].some((role) => center.roles.includes(role)) ? "CCI gradebook" : "My grades"}</Link>{center.roles.some((role) => role !== "student") && <Link className="rv-btn-ghost self-center" href={`/academy/${code}/cci/staff-connect`}>Staff Connect</Link>}{["founder", "program_director", "administration", "curriculum_director", "formation_coordinator"].some((role) => center.roles.includes(role)) && <Link className="rv-btn-ghost self-center" href={`/academy/${code}/cci/reports`}>CCI reports</Link>}{center.can_manage && <><form className="rv-card flex flex-1 flex-wrap gap-3 p-5" onSubmit={create}><label className="sr-only" htmlFor="task-title">New task</label><input id="task-title" required value={title} onChange={(e) => setTitle(e.target.value)} className="rv-input min-w-56 flex-1" placeholder="New CCI task"/><button className="rv-btn-primary">Create task</button></form><Link className="rv-btn-ghost self-center" href={`/academy/${code}/cci/members`}>Manage CCI roles</Link><Link className="rv-btn-ghost self-center" href={`/academy/${code}/cci/resources`}>Resources & approvals</Link><Link className="rv-btn-ghost self-center" href={`/academy/${code}/cci/calendar`}>CCI calendar</Link></>}</div>
      <section className="rv-card p-5"><h2 className="font-display text-xl">Integration setup</h2><p className="mt-1 text-sm text-[var(--rv-ink-muted)]">Not live until credentials are configured and testing succeeds.</p><ul className="mt-3 space-y-1 text-sm">{Object.entries(center.integration_status).map(([name, status]) => <li key={name}><span className="capitalize">{name.replaceAll("_", " ")}</span>: <span className="text-gold-500">{status.replaceAll("_", " ")}</span></li>)}</ul></section>
    </div>}
  </main></AppShell>;
}
