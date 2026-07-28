"use client";

import { FadeIn } from "@rhemavoice/ui";
import { FormEvent, useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Provider = {
  id: string;
  name: string;
  description: string;
  city: string;
  services: string;
  rating_avg: number;
  is_verified: boolean;
};

export default function TransportPage() {
  const { api, user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [active, setActive] = useState<Provider | null>(null);
  const [form, setForm] = useState({ pickup_location: "", destination: "", service_type: "", notes: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    api.transport.providers().then((list) => {
      const typed = list as unknown as Provider[];
      setProviders(typed);
      setActive(typed[0] || null);
    });
  }, [user, api]);

  async function onBook(e: FormEvent) {
    e.preventDefault();
    if (!active) return;
    await api.transport.book(active.id, form);
    setMessage("Booking request sent. The provider will contact you.");
    setForm({ pickup_location: "", destination: "", service_type: "", notes: "" });
  }

  return (
    <ModuleShell
      moduleId="transport"
      title="Rhema-Transervices"
      description="Book approved transportation providers across Liberia."
    >
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rv-card p-5">
            <h2 className="font-display text-xl">Providers</h2>
            <div className="mt-4 space-y-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActive(p)}
                  className={`w-full rounded-[12px] border p-4 text-left ${
                    active?.id === p.id ? "border-gold-500 bg-gold-500/10" : "border-[var(--rv-border)]"
                  }`}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-[var(--rv-ink-muted)]">{p.city} · {p.services}</p>
                  <p className="text-sm text-gold-500">★ {p.rating_avg}</p>
                </button>
              ))}
            </div>
          </section>

          {active && (
            <section className="rv-card p-5">
              <h2 className="font-display text-xl">Book with {active.name}</h2>
              <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">{active.description}</p>
              <form onSubmit={onBook} className="mt-4 space-y-3">
                <input
                  className="rv-input"
                  placeholder="Pickup location"
                  value={form.pickup_location}
                  onChange={(e) => setForm((f) => ({ ...f, pickup_location: e.target.value }))}
                  required
                />
                <input
                  className="rv-input"
                  placeholder="Destination"
                  value={form.destination}
                  onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                  required
                />
                <input
                  className="rv-input"
                  placeholder="Service type (e.g. Airport Transfer)"
                  value={form.service_type}
                  onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}
                />
                <textarea
                  className="rv-input min-h-[80px]"
                  placeholder="Notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
                <button className="rv-btn-primary w-full" type="submit">
                  Request booking
                </button>
              </form>
              {message && <p className="mt-3 text-sm text-gold-500">{message}</p>}
            </section>
          )}
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
