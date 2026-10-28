"use client";

import Link from "next/link";
import { BookOpen, BriefcaseBusiness, ChartNoAxesCombined, ClipboardCheck, GraduationCap, HeartHandshake, ShieldCheck, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChayilWorkspace } from "@/components/ChayilWorkspace";
import { useAuth } from "@/lib/auth";

type WorkspaceRole = "management" | "administrator" | "teacher" | "student" | "staff" | "mentor";
type Workspace = {
  institution: { name: string; tagline: string; student_count: number };
  role: WorkspaceRole;
  roles: string[];
  metrics: { open_tasks: number; completed_tasks: number; members: number; courses: number; pending_submissions: number; mentees: number; audit_events: number };
  announcements: Array<{ id: string; title: string; body: string; audience: string; published_at: string | null }>;
  links: Array<{ label: string; href: string; description: string }>;
};

const ROLE_STYLE: Record<WorkspaceRole, { label: string; description: string; icon: typeof ShieldCheck; tone: string }> = {
  management: { label: "Management Dashboard", description: "Institution-wide oversight, readiness, and strategic activity.", icon: ShieldCheck, tone: "bg-slate-900 text-white" },
  administrator: { label: "Administrator Dashboard", description: "People, program operations, and CCI administration.", icon: UsersRound, tone: "bg-blue-600 text-white" },
  teacher: { label: "Teacher Dashboard", description: "Teaching activity, learner work, and grading workflow.", icon: BookOpen, tone: "bg-emerald-600 text-white" },
  student: { label: "Student Dashboard", description: "Your courses, assignments, formation, and academic progress.", icon: GraduationCap, tone: "bg-violet-600 text-white" },
  staff: { label: "Staff Dashboard", description: "Program responsibilities and operational collaboration.", icon: BriefcaseBusiness, tone: "bg-amber-500 text-amber-950" },
  mentor: { label: "Mentor Dashboard", description: "Mentee progress, formation support, and private collaboration.", icon: HeartHandshake, tone: "bg-rose-600 text-white" },
};

export default function CCICommandCenterPage() {
  const { code } = useParams<{ code: string }>();
  const { api } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { setWorkspace(await api.academy.cciWorkspace(code) as unknown as Workspace); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load the Chayil workspace."); }
  }, [api, code]);
  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => workspace ? [
    { label: "Open tasks", value: workspace.metrics.open_tasks, icon: ClipboardCheck, visible: true },
    { label: "Completed", value: workspace.metrics.completed_tasks, icon: ChartNoAxesCombined, visible: true },
    { label: workspace.role === "mentor" ? "Mentees" : "Members", value: workspace.role === "mentor" ? workspace.metrics.mentees : workspace.metrics.members, icon: UsersRound, visible: workspace.role !== "student" },
    { label: workspace.role === "teacher" ? "To grade" : workspace.role === "management" ? "Audit events" : "Courses", value: workspace.role === "teacher" ? workspace.metrics.pending_submissions : workspace.role === "management" ? workspace.metrics.audit_events : workspace.metrics.courses, icon: BookOpen, visible: workspace.role !== "student" },
  ].filter((item) => item.visible) : [], [workspace]);

  return <ChayilWorkspace backHref={`/academy/${code}`}>
    {!workspace && !error && <p className="py-20 text-center text-sm text-slate-500">Loading Chayil workspace…</p>}
    {error && <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p className="font-semibold">Unable to open the workspace</p><p className="mt-1">{error}</p><button className="mt-4 rounded-lg bg-red-600 px-3 py-2 font-medium text-white" onClick={() => void load()}>Try again</button></section>}
    {workspace && <WorkspaceView code={code} workspace={workspace} metrics={metrics} />}
  </ChayilWorkspace>;
}

function WorkspaceView({ code, workspace, metrics }: { code: string; workspace: Workspace; metrics: Array<{ label: string; value: number; icon: typeof BookOpen }> }) {
  const style = ROLE_STYLE[workspace.role]; const Icon = style.icon;
  return <>
    <section className={`overflow-hidden rounded-2xl ${style.tone}`}>
      <div className="relative px-5 py-7 sm:px-8 sm:py-9"><div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-5"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold"><Icon className="h-3.5 w-3.5" />CHAYIL COMPANY INTENSIVE</span><h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{style.label}</h1><p className="mt-2 max-w-2xl text-sm opacity-85 sm:text-base">{style.description}</p></div><span className="rounded-xl bg-white/15 px-4 py-3 text-right text-xs"><span className="block opacity-75">Active role</span><strong className="mt-1 block text-sm capitalize">{workspace.role}</strong></span></div>
      </div>
    </section>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(({ label, value, icon: MetricIcon }) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><MetricIcon className="h-4 w-4 text-purple-700" /><p className="mt-3 text-2xl font-bold text-slate-900">{value}</p><p className="text-sm text-slate-500">{label}</p></div>)}</section>
    <section className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Your workspace</h2><p className="mt-1 text-sm text-slate-500">Role-authorized Chayil tools and records.</p></div><span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">{workspace.institution.name}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{workspace.links.map((link) => <Link key={link.label} href={link.href === "../" ? `/academy/${code}` : `/academy/${code}/cci/${link.href}`} className="group rounded-xl border border-slate-200 p-4 transition hover:border-purple-300 hover:bg-purple-50"><h3 className="font-semibold text-slate-800 group-hover:text-purple-950">{link.label} <span className="text-purple-600">→</span></h3><p className="mt-1 text-sm leading-5 text-slate-500">{link.description}</p></Link>)}</div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Official updates</h2><p className="mt-1 text-sm text-slate-500">Latest CCI communication for your role.</p><div className="mt-4 space-y-4">{workspace.announcements.map((item) => <article key={item.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-slate-800">{item.title}</h3><span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] capitalize text-slate-500">{item.audience}</span></div><p className="mt-1 text-sm leading-5 text-slate-600">{item.body}</p></article>)}{!workspace.announcements.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No official updates have been published.</p>}</div></div>
    </section>
  </>;
}
