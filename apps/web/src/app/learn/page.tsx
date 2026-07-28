"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Lesson = { id: string; title: string; teacher_name: string; area_name: string; is_voice: boolean };
type Session = { id: string; title: string; host_name: string; status: string; participant_count: number };

export default function LearnPage() {
  const { api, user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.learn.lessons(), api.learn.sessions("live")]).then(([l, s]) => {
      setLessons(l as unknown as Lesson[]);
      setSessions(s as unknown as Session[]);
    });
  }, [user, api]);

  return (
    <ModuleShell
      moduleId="learn"
      title="Rhema Learn"
      description="Voice-based learning, interactive lessons, and knowledge-sharing communities."
    >
      <FadeIn>
        <section className="rv-card p-5">
          <h2 className="font-display text-xl">Live Learning Sessions</h2>
          <div className="mt-4 space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-[12px] border border-[var(--rv-border)] p-4">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-[var(--rv-ink-muted)]">Host: {s.host_name}</p>
                </div>
                <span className="text-sm text-gold-500">{s.participant_count} joined</span>
              </div>
            ))}
            {!sessions.length && <p className="text-sm text-[var(--rv-ink-muted)]">No live sessions right now.</p>}
          </div>
        </section>

        <section className="rv-card mt-4 p-5">
          <h2 className="font-display text-xl">Lessons</h2>
          <div className="mt-4 space-y-3">
            {lessons.map((l) => (
              <div key={l.id} className="rounded-[12px] border border-[var(--rv-border)] p-4">
                <p className="font-medium">{l.title}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">
                  {l.area_name} · {l.teacher_name}
                  {l.is_voice ? " · Voice lesson" : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>
    </ModuleShell>
  );
}
