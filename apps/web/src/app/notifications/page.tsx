"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Notification = {
  id: string;
  title: string;
  body: string;
  category: string;
  action_url: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const { api, user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [onlyUnread, setOnlyUnread] = useState(false);

  async function load() {
    const res = await api.notifications.list(onlyUnread);
    if (Array.isArray(res)) {
      setItems(res as unknown as Notification[]);
    } else {
      setItems((res.results as unknown as Notification[]) || []);
      setUnread(res.unread_count || 0);
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api, onlyUnread]);

  async function markRead(id: string) {
    await api.notifications.read(id);
    await load();
  }

  async function markAll() {
    await api.notifications.readAll();
    await load();
  }

  return (
    <ModuleShell moduleId="notifications" title="Notifications" description="Alerts and updates across your modules.">
      <FadeIn>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <button className={!onlyUnread ? "rv-btn-primary" : "rv-btn-ghost"} onClick={() => setOnlyUnread(false)}>
              All
            </button>
            <button className={onlyUnread ? "rv-btn-primary" : "rv-btn-ghost"} onClick={() => setOnlyUnread(true)}>
              Unread ({unread})
            </button>
          </div>
          <button className="rv-btn-ghost" onClick={markAll}>
            Mark all read
          </button>
        </div>

        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`rv-card flex items-start justify-between gap-3 p-4 ${
                n.is_read ? "opacity-70" : "border-gold-500"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-gold-500" />}
                  <p className="font-medium">{n.title}</p>
                  <span className="rounded-full border border-[var(--rv-border)] px-2 py-0.5 text-xs capitalize">
                    {n.category}
                  </span>
                </div>
                {n.body && <p className="mt-1 text-sm text-[var(--rv-ink-muted)]">{n.body}</p>}
                {n.action_url && (
                  <a href={n.action_url} className="mt-1 inline-block text-xs text-purple-500">
                    Open →
                  </a>
                )}
              </div>
              {!n.is_read && (
                <button className="text-xs text-[var(--rv-ink-muted)]" onClick={() => markRead(n.id)}>
                  Mark read
                </button>
              )}
            </div>
          ))}
          {!items.length && <p className="text-[var(--rv-ink-muted)]">You&apos;re all caught up.</p>}
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
