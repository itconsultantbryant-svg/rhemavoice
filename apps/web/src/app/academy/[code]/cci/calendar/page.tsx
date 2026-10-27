"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

type Event = { id: string; title: string; starts_at: string; ends_at: string | null; location: string; audience: string; status: string };
type Payload = { events: Event[]; reminders: string; external_calendar: string };
export default function CCICalendarPage() {
  const { code } = useParams<{ code: string }>(); const { api } = useAuth(); const [data, setData] = useState<Payload | null>(null); const [error, setError] = useState("");
  const load = async () => { try { setData(await api.academy.cciEvents(code) as unknown as Payload); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load calendar."); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [api, code]);
  return <AppShell><main className="mx-auto max-w-4xl px-4 py-6 md:px-6"><Link href={`/academy/${code}/cci`} className="text-sm text-[var(--rv-ink-muted)]">← CCI Command Center</Link><h1 className="font-display mt-4 text-3xl">CCI calendar</h1><p className="mt-1 text-sm text-[var(--rv-ink-muted)]">Scheduled events shown from the CCI database.</p>{error && <p className="mt-6 text-sm text-[var(--rv-danger)]">{error}</p>}{data && <><p className="mt-4 text-sm text-gold-500">Reminders: {data.reminders.replaceAll("_", " ")} · External calendar: {data.external_calendar.replaceAll("_", " ")}</p><div className="mt-5 space-y-3">{data.events.map((event) => <section className="rv-card p-4" key={event.id}><p className="font-medium">{event.title}</p><p className="mt-1 text-sm text-[var(--rv-ink-muted)]">{new Date(event.starts_at).toLocaleString()}{event.location ? ` · ${event.location}` : ""}</p><p className="mt-1 text-xs capitalize text-gold-500">{event.audience} · {event.status}</p></section>)}{!data.events.length && <p className="text-sm text-[var(--rv-ink-muted)]">No scheduled CCI events.</p>}</div></>}</main></AppShell>;
}
