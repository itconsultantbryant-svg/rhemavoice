"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Opportunity = {
  id: string;
  type: string;
  title: string;
  organization: string;
  description: string;
  location: string;
  country: string;
  category: string;
  amount_label?: string;
  is_saved: boolean;
};

const TABS = [
  { key: "", label: "All" },
  { key: "job", label: "Jobs" },
  { key: "scholarship", label: "Scholarships" },
  { key: "grant", label: "Grants" },
  { key: "loan", label: "Loans" },
];

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<main className="p-6">Loading opportunities…</main>}>
      <OpportunitiesContent />
    </Suspense>
  );
}

function OpportunitiesContent() {
  const { api, user } = useAuth();
  const params = useSearchParams();
  const type = params.get("type") || "";
  const [items, setItems] = useState<Opportunity[]>([]);
  const [active, setActive] = useState<Opportunity | null>(null);
  const [cover, setCover] = useState("");

  async function load() {
    const list = (await api.opportunities.list(type || undefined)) as unknown as Opportunity[];
    setItems(list);
    setActive((prev) => list.find((x) => x.id === prev?.id) || list[0] || null);
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api, type]);

  return (
    <ModuleShell
      moduleId="opportunities"
      title="Opportunities"
      description="Jobs, scholarships, grants, and loans from approved organizations and partners."
    >
      <FadeIn>
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <a
              key={t.key || "all"}
              href={t.key ? `/opportunities?type=${t.key}` : "/opportunities"}
              className={`rounded-full px-4 py-2 text-sm transition ${
                type === t.key ? "bg-gold-500/15 text-gold-500" : "border border-[var(--rv-border)]"
              }`}
            >
              {t.label}
            </a>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rv-card p-5">
            <h2 className="font-display text-xl">Browse</h2>
            <div className="mt-4 max-h-[480px] space-y-2 overflow-y-auto">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActive(item)}
                  className={`w-full rounded-[12px] border p-4 text-left transition ${
                    active?.id === item.id ? "border-gold-500 bg-gold-500/10" : "border-[var(--rv-border)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{item.title}</p>
                    <span className="rounded-full border border-[var(--rv-border)] px-2 py-0.5 text-xs capitalize">{item.type}</span>
                  </div>
                  <p className="text-sm text-[var(--rv-ink-muted)]">{item.organization}</p>
                </button>
              ))}
            </div>
          </section>

          {active && (
            <section className="rv-card p-5">
              <span className="rounded-full border border-[var(--rv-border)] px-2 py-0.5 text-xs capitalize">{active.type}</span>
              <h2 className="font-display mt-2 text-2xl">{active.title}</h2>
              <p className="text-sm text-gold-500">{active.organization}</p>
              <p className="mt-4 text-[var(--rv-ink-muted)]">{active.description}</p>
              <dl className="mt-4 space-y-2 text-sm">
                {active.location && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--rv-ink-muted)]">Location</dt>
                    <dd>{active.location}</dd>
                  </div>
                )}
                {active.category && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--rv-ink-muted)]">Category</dt>
                    <dd>{active.category}</dd>
                  </div>
                )}
                {active.amount_label && (
                  <div className="flex justify-between">
                    <dt className="text-[var(--rv-ink-muted)]">Amount</dt>
                    <dd>{active.amount_label}</dd>
                  </div>
                )}
              </dl>
              <textarea
                className="rv-input mt-4 min-h-[80px]"
                placeholder="Cover note (optional)"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
              />
              <div className="mt-4 flex gap-2">
                <button className="rv-btn-primary" onClick={() => api.opportunities.apply(active.id, cover).then(load)}>
                  Apply
                </button>
                <button className="rv-btn-ghost" onClick={() => api.opportunities.save(active.id).then(load)}>
                  {active.is_saved ? "Unsave" : "Save"}
                </button>
              </div>
            </section>
          )}
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
