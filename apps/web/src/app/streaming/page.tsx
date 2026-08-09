"use client";

import { FadeIn } from "@rhemavoice/ui";
import { FormEvent, useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type StreamItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  church_name: string;
  series: string;
  viewers: number;
  duration_min: number;
  is_featured: boolean;
  chat_preview?: Array<{ id: string; display_name: string; message: string }>;
};

export default function StreamingPage() {
  const { api, user } = useAuth();
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [active, setActive] = useState<StreamItem | null>(null);
  const [chat, setChat] = useState("");
  const [prayer, setPrayer] = useState("");

  useEffect(() => {
    if (!user) return;
    api.streaming.list().then((data) => {
      const list = data as unknown as StreamItem[];
      setStreams(list);
      setActive(list.find((s) => s.status === "live") || list[0] || null);
    });
  }, [api, user]);

  async function sendChat(e: FormEvent) {
    e.preventDefault();
    if (!active || !chat.trim()) return;
    await api.streaming.chat(active.id, chat.trim());
    const refreshed = (await api.streaming.get(active.id)) as unknown as StreamItem;
    setActive(refreshed);
    setStreams((prev) => prev.map((s) => (s.id === refreshed.id ? refreshed : s)));
    setChat("");
  }

  async function sendPrayer(e: FormEvent) {
    e.preventDefault();
    if (!active || !prayer.trim()) return;
    await api.streaming.pray(active.id, prayer.trim());
    setPrayer("");
  }

  return (
    <ModuleShell
      moduleId="streaming"
      title="Church Streaming"
      description="Live services, sermon library, chat, prayer, and giving — Sacred Voice live."
    >
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="rv-card overflow-hidden p-0">
            <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-purple-950 via-purple-800 to-purple-600 text-white">
              <div className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                {active?.status || "offline"}
              </div>
              <div className="text-center">
                <p className="font-display text-2xl">{active?.title || "Select a stream"}</p>
                <p className="mt-2 text-sm text-white/75">{active?.church_name}</p>
                {active?.status === "live" && (
                  <p className="mt-3 text-gold-300">{active.viewers} watching</p>
                )}
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-[var(--rv-ink-muted)]">{active?.description}</p>
              {active?.series && <p className="mt-2 text-xs uppercase tracking-[0.18em] text-gold-500">Series · {active.series}</p>}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rv-card p-4">
              <h3 className="font-display text-lg">Live chat</h3>
              <div className="mt-3 max-h-40 space-y-2 overflow-y-auto text-sm">
                {(active?.chat_preview || []).map((m) => (
                  <p key={m.id}>
                    <span className="font-semibold text-gold-500">{m.display_name}: </span>
                    {m.message}
                  </p>
                ))}
                {!active?.chat_preview?.length && <p className="text-[var(--rv-ink-muted)]">Be the first to encourage someone.</p>}
              </div>
              <form onSubmit={sendChat} className="mt-3 flex gap-2">
                <input className="rv-input" value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Type a message…" />
                <button className="rv-btn-primary shrink-0" type="submit">
                  Send
                </button>
              </form>
            </div>

            <div className="rv-card p-4">
              <h3 className="font-display text-lg">Prayer request</h3>
              <form onSubmit={sendPrayer} className="mt-3 space-y-2">
                <input className="rv-input" value={prayer} onChange={(e) => setPrayer(e.target.value)} placeholder="What should we pray for?" />
                <button className="rv-btn-ghost w-full" type="submit">
                  Submit prayer
                </button>
              </form>
            </div>
          </section>
        </div>

        <h2 className="font-display mt-8 text-2xl">All streams</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {streams.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s)}
              className={`rv-card p-4 text-left transition duration-rv ${active?.id === s.id ? "border-gold-500" : ""}`}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-gold-500">{s.status}</p>
              <p className="font-display mt-1 text-lg">{s.title}</p>
              <p className="mt-1 text-xs text-[var(--rv-ink-muted)]">{s.church_name}</p>
            </button>
          ))}
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
