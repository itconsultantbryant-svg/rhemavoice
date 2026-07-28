"use client";

import { FadeIn } from "@rhemavoice/ui";
import { wsUrl } from "@rhemavoice/api-client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Conversation = {
  id: string;
  title: string;
  is_group: boolean;
  participant_names: string[];
  unread_count: number;
  last_message: { body: string } | null;
};

type Message = {
  id: string;
  body: string;
  sender_name: string;
  sender_id?: string;
  is_mine: boolean;
  created_at: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ChatPage() {
  const { api, user, getAccessToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  async function loadConversations() {
    const list = (await api.chat.conversations()) as unknown as Conversation[];
    setConversations(list);
    setActive((prev) => list.find((c) => c.id === prev?.id) || list[0] || null);
  }

  useEffect(() => {
    if (!user) return;
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api]);

  useEffect(() => {
    if (!active || !user) return;
    api.chat.messages(active.id).then((m) => setMessages(m as unknown as Message[]));

    const token = getAccessToken();
    if (!token) return;

    wsRef.current?.close();
    const socket = new WebSocket(wsUrl(API_URL, `/ws/chat/${active.id}/`, token));
    wsRef.current = socket;
    socket.onopen = () => setLive(true);
    socket.onclose = () => setLive(false);
    socket.onerror = () => setLive(false);
    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "message" && data.payload) {
          const payload = data.payload as Message;
          payload.is_mine = payload.sender_id === user.id;
          setMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]));
        }
      } catch {
        /* ignore */
      }
    };
    return () => socket.close();
  }, [active, api, user, getAccessToken]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!active || !draft.trim()) return;
    const body = draft.trim();
    setDraft("");
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ body }));
    } else {
      await api.chat.send(active.id, body);
      const m = await api.chat.messages(active.id);
      setMessages(m as unknown as Message[]);
    }
    loadConversations();
  }

  return (
    <ModuleShell moduleId="chat" title="Chat" description="Direct messages and group conversations.">
      <FadeIn>
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-gold-500" : "bg-[var(--rv-ink-muted)]"}`} />
          {live ? "Live connection" : "Reconnecting…"}
        </div>
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <section className="space-y-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={`rv-card block w-full p-3 text-left transition duration-rv ${
                  active?.id === c.id ? "border-gold-500" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.title || c.participant_names.join(", ")}</p>
                  {c.unread_count > 0 && (
                    <span className="rounded-full bg-gold-500 px-2 py-0.5 text-xs text-white">{c.unread_count}</span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-[var(--rv-ink-muted)]">
                  {c.last_message?.body || "No messages yet"}
                </p>
              </button>
            ))}
            {!conversations.length && <p className="text-sm text-[var(--rv-ink-muted)]">No conversations yet.</p>}
          </section>

          <section className="rv-card flex h-[70vh] flex-col p-0">
            {active ? (
              <>
                <div className="border-b border-[var(--rv-border)] p-4">
                  <p className="font-display text-lg">{active.title || active.participant_names.join(", ")}</p>
                  <p className="text-xs text-[var(--rv-ink-muted)]">{active.participant_names.join(" · ")}</p>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.is_mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-[14px] px-3 py-2 text-sm ${
                          m.is_mine
                            ? "bg-purple-500 text-white"
                            : "border border-[var(--rv-border)] bg-[var(--rv-surface)]"
                        }`}
                      >
                        {!m.is_mine && <p className="mb-0.5 text-xs opacity-70">{m.sender_name}</p>}
                        {m.body}
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
                <form onSubmit={send} className="flex gap-2 border-t border-[var(--rv-border)] p-3">
                  <input
                    className="rv-input flex-1"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message…"
                  />
                  <button className="rv-btn-primary" type="submit">
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-[var(--rv-ink-muted)]">Select a conversation.</p>
              </div>
            )}
          </section>
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
