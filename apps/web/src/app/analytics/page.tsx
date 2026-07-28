"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Overview = {
  cards: Array<{ key: string; label: string; value: number; module: string }>;
  engagement_series: Array<{ label: string; value: number; captured_for: string }>;
  module_breakdown: Array<{ module: string; value: number }>;
};

export default function AnalyticsPage() {
  const { api, user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    if (!user) return;
    api.analytics.overview().then(setData);
  }, [user, api]);

  const maxEngagement = Math.max(1, ...(data?.engagement_series.map((d) => d.value) || [1]));
  const maxModule = Math.max(1, ...(data?.module_breakdown.map((d) => d.value) || [1]));

  return (
    <ModuleShell moduleId="analytics" title="Analytics" description="Cross-module insights and engagement trends.">
      <FadeIn>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data?.cards.map((c) => (
            <div key={c.key} className="rv-card p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--rv-ink-muted)]">{c.label}</p>
              <p className="font-display mt-1 text-3xl">{c.value.toLocaleString()}</p>
              <p className="mt-1 text-xs capitalize text-purple-500">{c.module}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rv-card p-5">
            <h2 className="font-display text-xl">Daily active users</h2>
            <div className="mt-6 flex h-52 items-end gap-2">
              {data?.engagement_series.map((d) => (
                <div key={d.captured_for} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-[6px] bg-gradient-to-t from-purple-500 to-gold-500 transition-all duration-rv"
                    style={{ height: `${(d.value / maxEngagement) * 100}%` }}
                    title={`${d.value}`}
                  />
                  <span className="text-xs text-[var(--rv-ink-muted)]">{d.label}</span>
                </div>
              ))}
              {!data?.engagement_series.length && (
                <p className="text-sm text-[var(--rv-ink-muted)]">No engagement data yet.</p>
              )}
            </div>
          </section>

          <section className="rv-card p-5">
            <h2 className="font-display text-xl">Content by module</h2>
            <div className="mt-4 space-y-3">
              {data?.module_breakdown.map((m) => (
                <div key={m.module}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{m.module}</span>
                    <span className="text-[var(--rv-ink-muted)]">{m.value.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-black/5 dark:bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gold-500 transition-all duration-rv"
                      style={{ width: `${(m.value / maxModule) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
