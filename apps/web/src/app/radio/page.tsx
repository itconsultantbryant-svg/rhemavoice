"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Station = {
  id: string;
  name: string;
  genre: string;
  description: string;
  presenters: string;
  is_live: boolean;
  listeners: number;
  is_favorite: boolean;
  podcasts?: Array<{ id: string; title: string; host: string; duration_min: number }>;
};

export default function RadioPage() {
  const { api, user } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [active, setActive] = useState<Station | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.radio.stations().then((data) => {
      const list = data as unknown as Station[];
      setStations(list);
      setActive(list[0] || null);
    });
  }, [api, user]);

  async function toggleFavorite(id: string) {
    await api.radio.favorite(id);
    const list = (await api.radio.stations()) as unknown as Station[];
    setStations(list);
    setActive(list.find((s) => s.id === (active?.id || id)) || list[0] || null);
  }

  return (
    <ModuleShell moduleId="radio" title="Radio" description="Live stations, podcasts, favorites, and offline-ready listening.">
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <section className="rv-card overflow-hidden p-0">
            <div className="bg-gradient-to-r from-purple-900 to-purple-700 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-300">Now playing</p>
              <h2 className="font-display mt-2 text-3xl">{active?.name || "Select a station"}</h2>
              <p className="mt-2 text-sm text-white/80">{active?.presenters}</p>
              <p className="mt-1 text-sm text-gold-300">
                {active?.genre} · {active?.listeners || 0} listeners
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="rv-btn bg-gold-500 text-purple-950" onClick={() => setPlaying((p) => !p)}>
                  {playing ? "Pause" : "Listen live"}
                </button>
                {active && (
                  <button className="rv-btn border border-white/30 bg-white/10" onClick={() => toggleFavorite(active.id)}>
                    {active.is_favorite ? "Unfavorite" : "Favorite"}
                  </button>
                )}
              </div>
              {playing && (
                <div className="mt-4 flex items-end gap-1">
                  {[4, 8, 5, 10, 6, 9, 4, 7].map((h, i) => (
                    <span
                      key={i}
                      className="w-1.5 animate-pulse rounded-full bg-gold-300"
                      style={{ height: h * 4, animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="p-5">
              <p className="text-sm text-[var(--rv-ink-muted)]">{active?.description}</p>
              <h3 className="font-display mt-5 text-lg">Podcasts</h3>
              <div className="mt-3 space-y-2">
                {(active?.podcasts || []).map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-[12px] border border-[var(--rv-border)] px-3 py-2">
                    <div>
                      <p className="font-medium">{p.title}</p>
                      <p className="text-xs text-[var(--rv-ink-muted)]">
                        {p.host} · {p.duration_min} min
                      </p>
                    </div>
                    <button className="rv-btn-ghost text-xs">Play</button>
                  </div>
                ))}
                {!active?.podcasts?.length && <p className="text-sm text-[var(--rv-ink-muted)]">No podcasts yet.</p>}
              </div>
            </div>
          </section>

          <section className="rv-card p-4">
            <h3 className="font-display text-lg">Stations</h3>
            <div className="mt-3 space-y-2">
              {stations.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s)}
                  className={`block w-full rounded-[12px] border px-3 py-3 text-left ${
                    active?.id === s.id ? "border-gold-500 bg-gold-500/10" : "border-[var(--rv-border)]"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{s.name}</span>
                    {s.is_live && <span className="text-xs text-gold-500">LIVE</span>}
                  </div>
                  <p className="mt-1 text-xs text-[var(--rv-ink-muted)]">
                    {s.genre} · {s.listeners} listening
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
