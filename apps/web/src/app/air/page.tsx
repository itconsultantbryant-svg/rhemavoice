"use client";

import { FadeIn } from "@rhemavoice/ui";
import { FormEvent, useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Flight = {
  id: string;
  airline: string;
  departure_city: string;
  arrival_city: string;
  cabin_class: string;
  stops: number;
  price_cents: number;
  currency: string;
  agency_name: string;
};

export default function AirPage() {
  const { api, user } = useAuth();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [search, setSearch] = useState({ departure: "Monrovia", arrival: "" });
  const [active, setActive] = useState<Flight | null>(null);
  const [passenger, setPassenger] = useState({ passengers: 1, passenger_name: "" });
  const [message, setMessage] = useState("");

  async function load() {
    const list = (await api.air.flights(search.departure || undefined, search.arrival || undefined)) as unknown as Flight[];
    setFlights(list);
    setActive(list[0] || null);
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api]);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  async function onBook() {
    if (!active) return;
    await api.air.book(active.id, passenger);
    setMessage("Booking request submitted. Your travel partner will confirm availability.");
  }

  return (
    <ModuleShell
      moduleId="air"
      title="RhemaAir"
      description="Search and book flights through approved travel agencies."
    >
      <FadeIn>
        <form onSubmit={onSearch} className="rv-card mb-4 grid gap-3 p-5 sm:grid-cols-3">
          <input
            className="rv-input"
            placeholder="Departure city"
            value={search.departure}
            onChange={(e) => setSearch((s) => ({ ...s, departure: e.target.value }))}
          />
          <input
            className="rv-input"
            placeholder="Destination city"
            value={search.arrival}
            onChange={(e) => setSearch((s) => ({ ...s, arrival: e.target.value }))}
          />
          <button className="rv-btn-primary" type="submit">
            Search flights
          </button>
        </form>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rv-card p-5">
            <h2 className="font-display text-xl">Available Flights</h2>
            <div className="mt-4 space-y-2">
              {flights.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActive(f)}
                  className={`w-full rounded-[12px] border p-4 text-left ${
                    active?.id === f.id ? "border-gold-500 bg-gold-500/10" : "border-[var(--rv-border)]"
                  }`}
                >
                  <p className="font-medium">{f.departure_city} → {f.arrival_city}</p>
                  <p className="text-sm text-[var(--rv-ink-muted)]">{f.airline} · {f.agency_name}</p>
                  <p className="text-sm text-gold-500">
                    {f.currency} {(f.price_cents / 100).toFixed(0)} · {f.cabin_class}
                    {f.stops ? ` · ${f.stops} stop(s)` : " · Direct"}
                  </p>
                </button>
              ))}
              {!flights.length && <p className="text-sm text-[var(--rv-ink-muted)]">No flights found.</p>}
            </div>
          </section>

          {active && (
            <section className="rv-card p-5">
              <h2 className="font-display text-xl">Book Flight</h2>
              <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">
                {active.airline} — {active.departure_city} to {active.arrival_city}
              </p>
              <p className="text-lg font-semibold text-gold-500">
                {active.currency} {(active.price_cents / 100).toFixed(2)}
              </p>
              <div className="mt-4 space-y-3">
                <input
                  className="rv-input"
                  placeholder="Passenger name"
                  value={passenger.passenger_name}
                  onChange={(e) => setPassenger((p) => ({ ...p, passenger_name: e.target.value }))}
                />
                <input
                  className="rv-input"
                  type="number"
                  min={1}
                  placeholder="Passengers"
                  value={passenger.passengers}
                  onChange={(e) => setPassenger((p) => ({ ...p, passengers: Number(e.target.value) }))}
                />
                <button className="rv-btn-primary w-full" onClick={onBook}>
                  Request booking
                </button>
              </div>
              {message && <p className="mt-4 text-sm text-gold-500">{message}</p>}
            </section>
          )}
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
