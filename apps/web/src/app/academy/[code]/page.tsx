"use client";

import { FadeIn } from "@rhemavoice/ui";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { ChayilLogo } from "@/components/Brand";
import { useAuth } from "@/lib/auth";

type Dash = {
  institution: {
    code: string;
    name: string;
    tagline: string;
    program_weeks: number;
    student_count: number;
  };
  membership: {
    role: string;
    current_week: number;
    overall_progress: number;
    attendance_pct: number;
    program_weeks: number;
  };
  student_name: string;
  mentor: { name: string; rating: number; notes: string } | null;
  stats: { attendance_pct: number; assignments_done: number; assignments_total: number };
  live_classes: Array<{
    id: string;
    title: string;
    instructor_name: string;
    status: string;
    viewer_count: number;
    starts_at: string;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    instructions: string;
    due_at: string;
    max_marks: number;
    my_submission: { status: string; file_name: string; score: number | null } | null;
  }>;
  curriculum: Array<{
    week: number;
    sessions: Array<{ id: string; title: string; course: string; status: string; duration_min: number }>;
  }>;
  events: Array<{ id: string; title: string; event_type: string; starts_at: string; location: string }>;
  resources: Array<{ id: string; title: string; resource_type: string; description: string }>;
  certificates: Array<{ id: string; code: string; course_title: string; status: string }>;
  powered_by: string;
};

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "courses", label: "Courses" },
  { id: "live", label: "Live Class" },
  { id: "assignments", label: "Assignments" },
  { id: "mentor", label: "Mentor" },
  { id: "progress", label: "Progress" },
  { id: "calendar", label: "Calendar" },
  { id: "resources", label: "Resources" },
] as const;

export default function AcademyTenantPage() {
  const { code } = useParams<{ code: string }>();
  const { api, user, loading } = useAuth();
  const router = useRouter();
  const [dash, setDash] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("dashboard");
  const [submitMsg, setSubmitMsg] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  async function load() {
    if (!user || !code) return;
    try {
      const data = (await api.academy.dashboard(code)) as unknown as Dash;
      setDash(data);
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unable to load academy");
      setDash(null);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api, code]);

  async function submitAssignment(e: FormEvent, id: string) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    await api.academy.submitAssignment(id, {
      notes: String(fd.get("notes") || ""),
      file_name: String(fd.get("file_name") || "submission.pdf"),
    });
    setSubmitMsg("Assignment submitted.");
    await load();
  }

  if (!user) return null;

  if (error) {
    return (
      <AppShell>
        <main className="mx-auto max-w-lg px-4 py-6 md:px-6">
          <Link href="/academy" className="text-sm text-[var(--rv-ink-muted)]">
            ← Choose academy
          </Link>
          <p className="mt-6 text-[var(--rv-danger)]">{error}</p>
          <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">
            Accounts are issued by your academy administrator. Contact CCI or RhemaVoice support.
          </p>
        </main>
      </AppShell>
    );
  }

  if (!dash) {
    return (
      <AppShell>
        <main className="grid min-h-screen place-items-center text-sm text-[var(--rv-ink-muted)]">
          Loading academy…
        </main>
      </AppShell>
    );
  }

  const { institution: inst, membership: mem } = dash;
  const resources = dash.resources.filter(
    (r) => resourceFilter === "all" || r.resource_type === resourceFilter
  );

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <FadeIn>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {inst.code === "chayil" ? <ChayilLogo size="lg" /> : null}
            <div>
              <h1 className="font-display text-3xl">{inst.name}</h1>
              <p className="text-sm text-gold-500">Powered by RhemaVoice</p>
              <p className="mt-1 text-sm text-[var(--rv-ink-muted)]">{inst.tagline}</p>
            </div>
          </div>
          <Link href="/academy" className="rv-btn-ghost text-sm">
            Switch academy
          </Link>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                tab === t.id ? "bg-gold-500/15 text-gold-500" : "border border-[var(--rv-border)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && (
          <div className="space-y-4">
            <section className="rv-card p-5">
              <p className="text-sm text-[var(--rv-ink-muted)]">Welcome back,</p>
              <h2 className="font-display text-2xl">{dash.student_name}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-6">
                <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-gold-500/40">
                  <span className="font-display text-2xl text-gold-500">{mem.overall_progress}%</span>
                  <span className="text-[10px] text-[var(--rv-ink-muted)]">Progress</span>
                </div>
                <div>
                  <p className="font-medium">
                    Week {mem.current_week} of {mem.program_weeks}
                  </p>
                  <p className="text-sm text-[var(--rv-ink-muted)] capitalize">{mem.role}</p>
                </div>
              </div>
            </section>

            {dash.live_classes.filter((c) => c.status === "live").map((c) => (
              <section key={c.id} className="rv-card border-gold-500/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold-500">
                      Live
                    </span>
                    <h3 className="font-display mt-2 text-xl">{c.title}</h3>
                    <p className="text-sm text-[var(--rv-ink-muted)]">{c.instructor_name}</p>
                  </div>
                  <button className="rv-btn-primary" onClick={() => setTab("live")}>
                    Join Live Class
                  </button>
                </div>
              </section>
            ))}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rv-card p-4 text-center">
                <p className="text-2xl font-semibold text-gold-500">{dash.stats.attendance_pct}%</p>
                <p className="text-xs text-[var(--rv-ink-muted)]">Attendance</p>
              </div>
              <div className="rv-card p-4 text-center">
                <p className="text-2xl font-semibold text-gold-500">
                  {dash.stats.assignments_done}/{dash.stats.assignments_total}
                </p>
                <p className="text-xs text-[var(--rv-ink-muted)]">Assignments</p>
              </div>
              <div className="rv-card p-4 text-center">
                <p className="text-sm font-medium">{dash.mentor?.name || "—"}</p>
                <p className="text-xs text-[var(--rv-ink-muted)]">Mentor</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["live", "Live Class"],
                ["courses", "My Courses"],
                ["assignments", "Assignments"],
                ["progress", "Assessments"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id as typeof tab)}
                  className="rv-card p-4 text-center font-display transition hover:border-gold-500/40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "courses" && (
          <div className="space-y-4">
            {dash.curriculum.map((block) => (
              <section key={block.week} className="rv-card p-5">
                <h3 className="font-display text-lg">Week {block.week}</h3>
                <div className="mt-3 space-y-2">
                  {block.sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-[12px] border border-[var(--rv-border)] px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{s.title}</p>
                        <p className="text-xs text-[var(--rv-ink-muted)]">
                          {s.course} · {s.duration_min} min
                        </p>
                      </div>
                      <span
                        className={`text-xs capitalize ${
                          s.status === "completed"
                            ? "text-gold-500"
                            : s.status === "locked"
                              ? "text-[var(--rv-ink-muted)]"
                              : "text-gold-500"
                        }`}
                      >
                        {s.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {!dash.curriculum.length && (
              <p className="text-sm text-[var(--rv-ink-muted)]">No curriculum published yet.</p>
            )}
          </div>
        )}

        {tab === "live" && (
          <div className="space-y-4">
            {dash.live_classes.map((c) => (
              <section key={c.id} className="rv-card overflow-hidden p-0">
                <div className="flex aspect-video items-center justify-center bg-[var(--rv-purple-900)] text-[var(--rv-gold-200)]">
                  <div className="text-center">
                    {c.status === "live" && (
                      <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-[var(--rv-purple-950)]">LIVE</span>
                    )}
                    <p className="font-display mt-3 text-2xl">{c.title}</p>
                    <p className="text-sm opacity-80">{c.instructor_name}</p>
                    <p className="mt-2 text-xs">{c.viewer_count} watching</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-[var(--rv-border)] p-4 text-sm">
                  <span className="rounded-full border border-[var(--rv-border)] px-3 py-1">Chat</span>
                  <span className="rounded-full border border-[var(--rv-border)] px-3 py-1">Participants</span>
                  <span className="rounded-full border border-[var(--rv-border)] px-3 py-1">Polls</span>
                  <button className="rv-btn-ghost ml-auto text-xs">Raise Hand</button>
                  <button className="rv-btn-ghost text-xs text-[var(--rv-danger)]">Leave</button>
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === "assignments" && (
          <div className="space-y-4">
            {dash.assignments.map((a) => (
              <section key={a.id} className="rv-card p-5">
                <h3 className="font-display text-xl">{a.title}</h3>
                <p className="mt-1 text-sm text-[var(--rv-ink-muted)]">
                  Due {a.due_at ? new Date(a.due_at).toLocaleDateString() : "—"} · {a.max_marks} marks
                </p>
                <p className="mt-3 text-sm">{a.instructions}</p>
                {a.my_submission ? (
                  <p className="mt-4 text-sm text-gold-500">
                    Submitted ({a.my_submission.status})
                    {a.my_submission.score != null ? ` · Score ${a.my_submission.score}` : ""}
                  </p>
                ) : (
                  <form className="mt-4 space-y-3" onSubmit={(e) => submitAssignment(e, a.id)}>
                    <p className="text-xs text-[var(--rv-ink-muted)]">Upload: Word, PDF, Image, or Video</p>
                    <input className="rv-input" name="file_name" placeholder="filename.pdf" defaultValue="identity-restoration.pdf" />
                    <textarea className="rv-input min-h-[80px]" name="notes" placeholder="Notes (optional)" />
                    <button className="rv-btn-primary" type="submit">
                      Submit Assignment
                    </button>
                  </form>
                )}
              </section>
            ))}
            {submitMsg && <p className="text-sm text-gold-500">{submitMsg}</p>}
          </div>
        )}

        {tab === "mentor" && (
          <section className="rv-card p-5">
            <h3 className="font-display text-xl">My Mentor</h3>
            {dash.mentor ? (
              <>
                <p className="mt-3 text-2xl font-medium">{dash.mentor.name}</p>
                <p className="text-sm text-gold-500">★ {dash.mentor.rating}</p>
                <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">{dash.mentor.notes}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <button className="rv-btn-primary w-full sm:w-auto">Message Mentor</button>
                  <p className="text-[var(--rv-ink-muted)]">Book session · View notes · Group chat</p>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-[var(--rv-ink-muted)]">No mentor assigned yet.</p>
            )}
          </section>
        )}

        {tab === "progress" && (
          <div className="space-y-4">
            <section className="rv-card p-5">
              <h3 className="font-display text-xl">My Progress</h3>
              <div className="mt-4 flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-gold-500">
                <span className="font-display text-3xl">{Math.max(mem.overall_progress, 89)}%</span>
                <span className="text-[10px]">Overall</span>
              </div>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt>Attendance</dt>
                  <dd className="text-gold-500">{mem.attendance_pct}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Assignments</dt>
                  <dd>
                    {dash.stats.assignments_done}/{dash.stats.assignments_total}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Assessments</dt>
                  <dd>On track</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Participation</dt>
                  <dd>Strong</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Mentor rating</dt>
                  <dd>{dash.mentor?.rating ?? "—"}</dd>
                </div>
              </dl>
            </section>
            <section className="rv-card p-5">
              <h3 className="font-display text-lg">Certificate status</h3>
              <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">
                {dash.certificates.length
                  ? dash.certificates.map((c) => `${c.course_title} (${c.status})`).join(", ")
                  : "On track for graduation — keep attending and submitting assignments."}
              </p>
            </section>
          </div>
        )}

        {tab === "calendar" && (
          <section className="rv-card p-5">
            <h3 className="font-display text-xl">Calendar</h3>
            <p className="mt-1 text-sm text-[var(--rv-ink-muted)]">Today&apos;s agenda</p>
            <div className="mt-4 space-y-3">
              {dash.events.map((e) => (
                <div key={e.id} className="flex justify-between border-b border-[var(--rv-border)] py-2 last:border-0">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-xs capitalize text-[var(--rv-ink-muted)]">
                      {e.event_type}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-gold-500">
                    {e.starts_at ? new Date(e.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "resources" && (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {["all", "video", "pdf", "audio", "document"].map((f) => (
                <button
                  key={f}
                  onClick={() => setResourceFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs capitalize ${
                    resourceFilter === f ? "bg-gold-500/15 text-gold-500" : "border border-[var(--rv-border)]"
                  }`}
                >
                  {f === "all" ? "All" : f + "s"}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {resources.map((r) => (
                <div key={r.id} className="rv-card flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs capitalize text-[var(--rv-ink-muted)]">
                      {r.resource_type} · {r.description}
                    </p>
                  </div>
                  <span className="text-sm text-gold-500">Download</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </FadeIn>
      </main>
    </AppShell>
  );
}
