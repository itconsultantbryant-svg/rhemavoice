"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Tier = { id: string; name: string; price_cents: number; quantity_available: number };
type EventItem = {
  id: string;
  title: string;
  organizer: string;
  description: string;
  venue: string;
  city: string;
  starts_at: string;
  category: string;
  tiers: Tier[];
};

export default function TicketingPage() {
  const { api, user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [active, setActive] = useState<EventItem | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    api.ticketing.events().then((list) => {
      const typed = list as unknown as EventItem[];
      setEvents(typed);
      setActive(typed[0] || null);
    });
  }, [user, api]);

  async function purchase(tierId: string) {
    if (!active) return;
    await api.ticketing.purchase(active.id, tierId);
    setMessage("Ticket purchased! Check your tickets in your account.");
  }

  return (
    <ModuleShell
      moduleId="ticketing"
      title="Rhema-E-Ticketing"
      description="Discover events and purchase tickets from approved organizers."
    >
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rv-card p-5">
            <h2 className="font-display text-xl">Upcoming Events</h2>
            <div className="mt-4 space-y-2">
              {events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setActive(e)}
                  className={`w-full rounded-[12px] border p-4 text-left ${
                    active?.id === e.id ? "border-gold-500 bg-gold-500/10" : "border-[var(--rv-border)]"
                  }`}
                >
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-[var(--rv-ink-muted)]">{e.organizer} · {e.venue}</p>
                  <p className="text-xs text-gold-500">{e.category}</p>
                </button>
              ))}
            </div>
          </section>

          {active && (
            <section className="rv-card p-5">
              <h2 className="font-display text-2xl">{active.title}</h2>
              <p className="text-sm text-gold-500">{active.organizer}</p>
              <p className="mt-4 text-[var(--rv-ink-muted)]">{active.description}</p>
              <p className="mt-2 text-sm">{active.venue}, {active.city}</p>
              <h3 className="font-display mt-6 text-lg">Tickets</h3>
              <div className="mt-3 space-y-2">
                {active.tiers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-[12px] border border-[var(--rv-border)] p-4">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-sm text-[var(--rv-ink-muted)]">{t.quantity_available} available</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gold-500">${(t.price_cents / 100).toFixed(2)}</p>
                      <button className="rv-btn-ghost mt-1 text-xs" onClick={() => purchase(t.id)}>
                        Purchase
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {message && <p className="mt-4 text-sm text-gold-500">{message}</p>}
            </section>
          )}
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
