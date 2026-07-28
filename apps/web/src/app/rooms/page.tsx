"use client";

import { FadeIn } from "@rhemavoice/ui";
import { FormEvent, useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Room = {
  id: string;
  title: string;
  description: string;
  visibility: string;
  topic: string;
  is_live: boolean;
  participant_count: number;
  host_name: string;
  recording_enabled: boolean;
  my_participation?: { role: string; is_muted: boolean; hand_raised: boolean } | null;
  active_poll?: { question: string; options: string[] } | null;
  participants_preview?: Array<{ display_name: string; role: string; hand_raised: boolean }>;
};

export default function RoomsPage() {
  const { api, user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [active, setActive] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; display_name: string; message: string }>>([]);
  const [chat, setChat] = useState("");

  async function refresh() {
    const list = (await api.rooms.list()) as unknown as Room[];
    setRooms(list);
    if (active) {
      const next = list.find((r) => r.id === active.id) || list[0] || null;
      setActive(next);
      if (next) setMessages((await api.rooms.messages(next.id)) as unknown as typeof messages);
    } else {
      const live = list.find((r) => r.is_live) || list[0] || null;
      setActive(live);
      if (live) setMessages((await api.rooms.messages(live.id)) as unknown as typeof messages);
    }
  }

  useEffect(() => {
    if (!user) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api]);

  async function selectRoom(room: Room) {
    setActive(room);
    setMessages((await api.rooms.messages(room.id)) as unknown as typeof messages);
  }

  async function join() {
    if (!active) return;
    await api.rooms.join(active.id);
    await refresh();
  }

  async function raiseHand() {
    if (!active) return;
    await api.rooms.raiseHand(active.id);
    await refresh();
  }

  async function toggleMute() {
    if (!active) return;
    await api.rooms.mute(active.id);
    await refresh();
  }

  async function sendChat(e: FormEvent) {
    e.preventDefault();
    if (!active || !chat.trim()) return;
    await api.rooms.chat(active.id, chat.trim());
    setChat("");
    setMessages((await api.rooms.messages(active.id)) as unknown as typeof messages);
  }

  return (
    <ModuleShell
      moduleId="rooms"
      title="Rhema Rooms"
      description="Public and private voice rooms with raise hand, mute, polls, and chat."
    >
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className="rv-card overflow-hidden p-0">
            <div className="bg-gradient-to-br from-purple-950 via-purple-800 to-purple-600 p-6 text-white">
              <div className="flex flex-wrap items-center gap-2">
                {active?.is_live && (
                  <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold uppercase">Live</span>
                )}
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs uppercase tracking-wider">
                  {active?.visibility || "—"}
                </span>
              </div>
              <h2 className="font-display mt-4 text-3xl">{active?.title || "Select a room"}</h2>
              <p className="mt-2 text-sm text-white/75">{active?.description}</p>
              <p className="mt-4 text-gold-300">
                {active?.participant_count || 0} in room · Host {active?.host_name || "—"}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="rv-btn bg-gold-500 text-purple-950" onClick={join}>
                  {active?.my_participation ? "Joined" : "Join room"}
                </button>
                <button className="rv-btn border border-white/30 bg-white/10" onClick={raiseHand}>
                  {active?.my_participation?.hand_raised ? "Lower hand" : "Raise hand"}
                </button>
                <button className="rv-btn border border-white/30 bg-white/10" onClick={toggleMute}>
                  {active?.my_participation?.is_muted === false ? "Mute" : "Unmute"}
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <h3 className="font-display text-lg">Participants</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {(active?.participants_preview || []).map((p, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{p.display_name}</span>
                      <span className="text-[var(--rv-ink-muted)]">
                        {p.role}
                        {p.hand_raised ? " · ✋" : ""}
                      </span>
                    </li>
                  ))}
                  {!active?.participants_preview?.length && (
                    <li className="text-[var(--rv-ink-muted)]">Join to appear here.</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="font-display text-lg">Poll</h3>
                {active?.active_poll ? (
                  <div className="mt-2">
                    <p className="text-sm font-medium">{active.active_poll.question}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {active.active_poll.options.map((opt) => (
                        <span key={opt} className="rounded-full border border-[var(--rv-border)] px-3 py-1 text-xs">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">No active poll.</p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rv-card p-4">
              <h3 className="font-display text-lg">Room chat</h3>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto text-sm">
                {messages.map((m) => (
                  <p key={m.id}>
                    <span className="font-semibold text-gold-500">{m.display_name}: </span>
                    {m.message}
                  </p>
                ))}
                {!messages.length && <p className="text-[var(--rv-ink-muted)]">Say hello to the room.</p>}
              </div>
              <form onSubmit={sendChat} className="mt-3 flex gap-2">
                <input className="rv-input" value={chat} onChange={(e) => setChat(e.target.value)} placeholder="Message…" />
                <button className="rv-btn-primary shrink-0" type="submit">
                  Send
                </button>
              </form>
            </div>

            <div className="rv-card p-4">
              <h3 className="font-display text-lg">All rooms</h3>
              <div className="mt-3 space-y-2">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectRoom(r)}
                    className={`block w-full rounded-[12px] border px-3 py-3 text-left transition duration-rv ${
                      active?.id === r.id ? "border-gold-500 bg-gold-500/10" : "border-[var(--rv-border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{r.title}</span>
                      {r.is_live && <span className="text-xs font-semibold text-red-600">LIVE</span>}
                    </div>
                    <p className="mt-1 text-xs text-[var(--rv-ink-muted)]">
                      {r.topic} · {r.participant_count} listening
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
