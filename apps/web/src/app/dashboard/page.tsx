"use client";

import { FadeIn } from "@rhemavoice/ui";
import { BRAND, type DashboardPayload, type ModuleMeta } from "@rhemavoice/shared";
import Link from "next/link";
import { BookOpen, CalendarDays, Church, Compass, Radio, Sparkles, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { ModuleIcon } from "@/components/ModuleIcon";
import { useAuth } from "@/lib/auth";

function Section({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rv-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-xl">{icon}{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LiveBadge() {
  return (
    <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-500">
      Live
    </span>
  );
}

export default function DashboardPage() {
  const { user, api, loading, logout } = useAuth();
  const router = useRouter();
  const [dash, setDash] = useState<DashboardPayload | null>(null);
  const [modules, setModules] = useState<ModuleMeta[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.dashboard.get(), api.modules.list()]).then(([d, m]) => {
      setDash(d);
      setModules(m);
    });
  }, [user, api]);

  if (loading || !user || !dash) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--rv-purple-950)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/loading_cover.jpeg"
          alt="Loading RhemaVoice"
          className="h-full max-h-screen w-full object-cover md:max-w-md md:rounded-3xl"
        />
      </main>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <FadeIn>
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-500/10 text-gold-500"><Sparkles className="h-6 w-6" /></span>
            <div><p className="text-xs uppercase tracking-[0.18em] text-gold-500">{BRAND.name}</p><h1 className="font-display text-2xl md:text-3xl">{dash.greeting}</h1></div>
          </div>

          <div className="mb-8">
            <input className="rv-input" placeholder="Search RhemaVoice…" />
          </div>

          {/* Modules grid */}
          <section className="mb-10">
            <h2 className="font-display mb-1 text-2xl">Modules</h2>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {modules.map((m, i) => (
                <Link
                  key={m.id}
                  href={m.route}
                  title={m.name}
                  className="rv-card group relative flex aspect-square flex-col items-center justify-center gap-2.5 p-3 text-center transition duration-rv hover:border-gold-500/50"
                  style={{ transitionDelay: `${i * 20}ms` }}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500 transition group-hover:bg-gold-500/20">
                    <ModuleIcon name={m.icon} className="h-6 w-6" />
                  </span>
                  <span className="font-display text-sm leading-tight">{m.name}</span>
                  {m.requires_profile && !m.profile_complete && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold-500" title="Profile required" />
                  )}
                </Link>
              ))}
            </div>
          </section>

          {/* Live & happening now */}
          <section className="mb-4">
            <h2 className="flex items-center gap-2 font-display text-2xl"><Compass className="h-6 w-6 text-gold-500"/>Now</h2>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Section title="Live" icon={<Church className="h-5 w-5 text-gold-500"/>} action={<Link href="/streaming" aria-label="Open live streams" className="text-sm text-gold-500">→</Link>}>
              {dash.live_churches.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-[var(--rv-border)] py-2 last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.title}</span>
                      <LiveBadge />
                    </div>
                    <p className="text-sm text-[var(--rv-ink-muted)]">{item.church_name}</p>
                  </div>
                  <Link href="/streaming" className="rv-btn-ghost text-xs">
                    Join Live
                  </Link>
                </div>
              ))}
              {dash.live_rooms.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-[var(--rv-border)] py-2 last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.title}</span>
                      <LiveBadge />
                    </div>
                    <p className="text-sm text-[var(--rv-ink-muted)]">Room · {item.host}</p>
                  </div>
                  <span className="text-sm text-gold-500">{item.participants}</span>
                </div>
              ))}
            </Section>

            <Section title="Radio" icon={<Radio className="h-5 w-5 text-gold-500"/>} action={<Link href="/radio" aria-label="Open radio" className="text-sm text-gold-500">→</Link>}>
              {dash.live_radio.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-[var(--rv-border)] py-2 last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.station}</span>
                      <LiveBadge />
                    </div>
                    <p className="text-sm text-[var(--rv-ink-muted)]">{item.program}</p>
                  </div>
                  <span className="text-sm text-gold-500">{item.listeners}</span>
                </div>
              ))}
            </Section>

            <Section title="Verse" icon={<BookOpen className="h-5 w-5 text-gold-500"/>}>
              <p className="italic text-[var(--rv-ink-muted)]">&ldquo;{dash.daily_verse.text}&rdquo;</p>
              <p className="mt-2 text-sm font-semibold text-gold-500">
                {dash.daily_verse.reference} · {dash.daily_verse.translation}
              </p>
            </Section>

            <Section title="Academy" icon={<BookOpen className="h-5 w-5 text-gold-500"/>} action={<Link href="/academy" aria-label="Open academy" className="text-sm text-gold-500">→</Link>}>
              {dash.academy_courses.map((c) => (
                <div key={c.id} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-sm">
                    <span>{c.title}</span>
                    <span>{c.progress ?? 0}%</span>
                  </div>
                  <p className="text-xs text-[var(--rv-ink-muted)]">{c.academy}</p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gold-500" style={{ width: `${c.progress ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </Section>

            <Section
              title="Opportunities" icon={<Target className="h-5 w-5 text-gold-500"/>}
              action={<Link href="/opportunities" aria-label="Open opportunities" className="text-sm text-gold-500">→</Link>}
            >
              {dash.featured_opportunities.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between border-b border-[var(--rv-border)] py-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{o.title}</p>
                    <p className="text-sm text-[var(--rv-ink-muted)]">{o.organization}</p>
                  </div>
                  <span className="rounded-full border border-[var(--rv-border)] px-2 py-0.5 text-xs capitalize">
                    {o.type}
                  </span>
                </div>
              ))}
            </Section>

            <Section title="Events" icon={<CalendarDays className="h-5 w-5 text-gold-500"/>}>
              {dash.upcoming_events.slice(0, 2).map((e) => (
                <div key={e.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-[var(--rv-ink-muted)]">{e.location}</p>
                </div>
              ))}
              {dash.featured_flights.slice(0, 1).map((f) => (
                <div key={f.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                  <p className="font-medium">{f.route}</p>
                  <p className="text-sm text-[var(--rv-ink-muted)]">
                    {f.agency} · {f.price_label}
                  </p>
                </div>
              ))}
            </Section>
          </div>

          {dash.advertisement && (
            <section className="rv-card mt-8 overflow-hidden bg-gradient-to-r from-[var(--rv-purple-900)] to-[var(--rv-purple-700)] p-6 text-gold-200">
              <p className="text-sm uppercase tracking-[0.2em] text-gold-300">Featured</p>
              <h3 className="font-display mt-2 text-2xl">{dash.advertisement.title}</h3>
              <Link href="/ticketing" className="rv-btn mt-4 bg-gold-500 text-purple-950">
                {dash.advertisement.cta}
              </Link>
            </section>
          )}
        </FadeIn>
      </main>
    </AppShell>
  );
}
