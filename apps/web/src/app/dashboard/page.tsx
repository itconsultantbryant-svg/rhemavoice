"use client";

import { FadeIn, Pressable } from "@rhemavoice/ui";
import { BRAND, type DashboardPayload, type ModuleMeta } from "@rhemavoice/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RhemaLogo } from "@/components/Brand";
import { ModuleIcon } from "@/components/ModuleIcon";
import { useAuth } from "@/lib/auth";

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rv-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LiveBadge() {
  return <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-500">Live</span>;
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
        <img src="/brand/loading_cover.jpeg" alt="Loading RhemaVoice" className="h-full max-h-screen w-full object-cover md:max-w-md md:rounded-3xl" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <FadeIn>
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <RhemaLogo size="md" href={undefined} />
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-gold-500">{BRAND.name}</p>
              <h1 className="font-display mt-1 text-3xl md:text-4xl">{dash.greeting}</h1>
              <p className="mt-1 text-sm text-[var(--rv-ink-muted)]">{dash.tagline || BRAND.tagline}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/settings" className="rv-btn-ghost">
              Settings
            </Link>
            <button className="rv-btn-ghost" onClick={() => logout().then(() => router.replace("/"))}>
              Log out
            </button>
          </div>
        </header>

        <div className="mb-6">
          <input
            className="rv-input"
            placeholder="Search churches, courses, jobs, events, flights…"
          />
        </div>

        <section className="rv-card mb-6 p-5">
          <h2 className="font-display text-xl">Daily Verse</h2>
          <p className="mt-3 italic text-[var(--rv-ink-muted)]">&ldquo;{dash.daily_verse.text}&rdquo;</p>
          <p className="mt-2 text-sm font-semibold text-gold-500">
            {dash.daily_verse.reference} · {dash.daily_verse.translation}
          </p>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Section title="Live Churches" action={<Link href="/streaming" className="text-sm text-gold-500">View all</Link>}>
            {dash.live_churches.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-[var(--rv-border)] py-2 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    <LiveBadge />
                  </div>
                  <p className="text-sm text-[var(--rv-ink-muted)]">{item.church_name}</p>
                </div>
                <span className="text-sm text-gold-500">{item.viewers} watching</span>
              </div>
            ))}
          </Section>

          <Section title="Live Radio" action={<Link href="/radio" className="text-sm text-gold-500">View all</Link>}>
            {dash.live_radio.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-[var(--rv-border)] py-2 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.station}</span>
                    <LiveBadge />
                  </div>
                  <p className="text-sm text-[var(--rv-ink-muted)]">{item.program}</p>
                </div>
                <span className="text-sm text-gold-500">{item.listeners} listening</span>
              </div>
            ))}
          </Section>

          <Section title="Rhema Rooms" action={<Link href="/rooms" className="text-sm text-gold-500">View all</Link>}>
            {dash.live_rooms.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-[var(--rv-border)] py-2 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    <LiveBadge />
                  </div>
                  <p className="text-sm text-[var(--rv-ink-muted)]">Host: {item.host}</p>
                </div>
                <span className="text-sm text-gold-500">{item.participants} in room</span>
              </div>
            ))}
          </Section>

          <Section title="Rhema Learn" action={<Link href="/learn" className="text-sm text-gold-500">Explore</Link>}>
            {dash.learn_highlights.map((item) => (
              <div key={item.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{item.teacher}</p>
              </div>
            ))}
          </Section>

          <Section title="Rhema Academy" action={<Link href="/academy" className="text-sm text-gold-500">My courses</Link>}>
            {dash.academy_courses.map((c) => (
              <div key={c.id} className="mb-3 last:mb-0">
                <div className="flex justify-between text-sm">
                  <span>{c.title}</span>
                  <span>{c.progress ?? 0}%</span>
                </div>
                <p className="text-xs text-[var(--rv-ink-muted)]">{c.academy}</p>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-900/10 dark:bg-white/10">
                  <div className="h-full rounded-full bg-gold-500" style={{ width: `${c.progress ?? 0}%` }} />
                </div>
              </div>
            ))}
          </Section>

          <Section title="Business Hub" action={<Link href="/business" className="text-sm text-gold-500">Browse</Link>}>
            {dash.featured_businesses.map((b) => (
              <div key={b.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                <p className="font-medium">{b.name}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{b.category}</p>
              </div>
            ))}
          </Section>

          <Section title="Jobs" action={<Link href="/opportunities?type=job" className="text-sm text-gold-500">View all</Link>}>
            {dash.featured_jobs.map((j) => (
              <div key={j.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                <p className="font-medium">{j.title}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{j.company}</p>
              </div>
            ))}
          </Section>

          <Section title="Scholarships" action={<Link href="/opportunities?type=scholarship" className="text-sm text-gold-500">View all</Link>}>
            {dash.featured_scholarships.map((s) => (
              <div key={s.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{s.organization}</p>
              </div>
            ))}
          </Section>

          <Section title="Grants" action={<Link href="/opportunities?type=grant" className="text-sm text-gold-500">View all</Link>}>
            {dash.featured_grants.map((g) => (
              <div key={g.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                <p className="font-medium">{g.title}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{g.organization}</p>
              </div>
            ))}
          </Section>

          <Section title="Loans" action={<Link href="/opportunities?type=loan" className="text-sm text-gold-500">View all</Link>}>
            {dash.featured_loans.map((l) => (
              <div key={l.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                <p className="font-medium">{l.title}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{l.institution}</p>
              </div>
            ))}
          </Section>

          <Section title="Transportation" action={<Link href="/transport" className="text-sm text-gold-500">Book</Link>}>
            {dash.transport_services.map((t) => (
              <div key={t.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                <p className="font-medium">{t.company}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{t.service} · {t.location}</p>
              </div>
            ))}
          </Section>

          <Section title="Event Tickets" action={<Link href="/ticketing" className="text-sm text-gold-500">Events</Link>}>
            {dash.upcoming_events.map((e) => (
              <div key={e.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                <p className="font-medium">{e.title}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{e.location}</p>
              </div>
            ))}
          </Section>

          <Section title="RhemaAir" action={<Link href="/air" className="text-sm text-gold-500">Search flights</Link>}>
            {dash.featured_flights.map((f) => (
              <div key={f.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                <p className="font-medium">{f.route}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{f.agency} · {f.price_label}</p>
              </div>
            ))}
          </Section>

          <Section title="Partner Updates">
            {dash.partner_updates.map((p) => (
              <div key={p.id} className="border-b border-[var(--rv-border)] py-2 last:border-0">
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{p.partner}</p>
              </div>
            ))}
          </Section>

          <Section title="Featured Opportunities">
            {dash.featured_opportunities.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b border-[var(--rv-border)] py-2 last:border-0">
                <div>
                  <p className="font-medium">{o.title}</p>
                  <p className="text-sm text-[var(--rv-ink-muted)]">{o.organization}</p>
                </div>
                <span className="rounded-full border border-[var(--rv-border)] px-2 py-0.5 text-xs capitalize">{o.type}</span>
              </div>
            ))}
          </Section>
        </div>

        <section className="mt-8">
          <h2 className="font-display mb-1 text-2xl">Platform Modules</h2>
          <p className="mb-4 text-sm text-[var(--rv-ink-muted)]">Core RhemaVoice services — tap to open</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5">
            {modules.map((m, i) => (
              <Pressable key={m.id}>
                <Link
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
              </Pressable>
            ))}
          </div>
        </section>

        {dash.advertisement && (
          <section className="rv-card mt-8 overflow-hidden bg-gradient-to-r from-navy-900 to-navy-800 p-6 text-gold-200">
            <p className="text-sm uppercase tracking-[0.2em] text-gold-300">Featured</p>
            <h3 className="font-display mt-2 text-2xl">{dash.advertisement.title}</h3>
            <Link href="/ticketing" className="rv-btn mt-4 bg-gold-500 text-navy-900">
              {dash.advertisement.cta}
            </Link>
          </section>
        )}
      </FadeIn>
    </main>
  );
}
