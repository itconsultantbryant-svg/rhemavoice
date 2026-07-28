"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Church = {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  pastor_name: string;
  member_count: number;
  is_verified: boolean;
  is_member: boolean;
  my_role: string | null;
  upcoming_events: Array<{ id: string; title: string; description: string; location: string }>;
};

export default function ChurchPage() {
  const { api, user } = useAuth();
  const [churches, setChurches] = useState<Church[]>([]);
  const [active, setActive] = useState<Church | null>(null);

  async function load() {
    const list = (await api.church.list()) as unknown as Church[];
    setChurches(list);
    setActive((prev) => list.find((c) => c.id === prev?.id) || list[0] || null);
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api]);

  async function toggleMembership() {
    if (!active) return;
    if (active.is_member) await api.church.leave(active.id);
    else await api.church.join(active.id);
    await load();
  }

  return (
    <ModuleShell moduleId="church" title="Church" description="Find your church community, join, and see upcoming events.">
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <section className="space-y-3">
            {churches.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={`rv-card block w-full p-4 text-left transition duration-rv ${
                  active?.id === c.id ? "border-gold-500" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg">{c.name}</p>
                    <p className="text-xs text-[var(--rv-ink-muted)]">
                      {c.city}, {c.country}
                    </p>
                  </div>
                  {c.is_verified && <span className="text-xs text-gold-500">Verified</span>}
                </div>
                <p className="mt-2 text-xs text-[var(--rv-ink-muted)]">{c.member_count} members</p>
              </button>
            ))}
          </section>

          <section className="rv-card p-5">
            {active ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-3xl">{active.name}</h2>
                    <p className="mt-1 text-sm text-[var(--rv-ink-muted)]">
                      Led by {active.pastor_name || "Leadership team"} · {active.city}, {active.country}
                    </p>
                  </div>
                  <button className="rv-btn-primary" onClick={toggleMembership}>
                    {active.is_member ? `Leave (${active.my_role})` : "Join church"}
                  </button>
                </div>
                <p className="mt-4 text-sm text-[var(--rv-ink-muted)]">{active.description}</p>
                <h3 className="font-display mt-6 text-lg">Upcoming events</h3>
                <div className="mt-3 space-y-2">
                  {active.upcoming_events.map((e) => (
                    <div key={e.id} className="rounded-[12px] border border-[var(--rv-border)] p-3">
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-[var(--rv-ink-muted)]">{e.location}</p>
                      {e.description && <p className="mt-1 text-sm text-[var(--rv-ink-muted)]">{e.description}</p>}
                    </div>
                  ))}
                  {!active.upcoming_events.length && (
                    <p className="text-sm text-[var(--rv-ink-muted)]">No upcoming events.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[var(--rv-ink-muted)]">Select a church.</p>
            )}
          </section>
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
