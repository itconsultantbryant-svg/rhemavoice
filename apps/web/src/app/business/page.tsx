"use client";

import { FadeIn } from "@rhemavoice/ui";
import { FormEvent, useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type BusinessItem = {
  id: string;
  name: string;
  category_name: string;
  description: string;
  city: string;
  country: string;
  verified: boolean;
  featured: boolean;
  rating_avg: number;
  review_count: number;
  is_favorite: boolean;
  products?: Array<{ id: string; title: string; price_cents: number; is_service: boolean }>;
};

export default function BusinessPage() {
  const { api, user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [active, setActive] = useState<BusinessItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function load() {
    const list = (await api.business.list()) as unknown as BusinessItem[];
    setBusinesses(list);
    setActive((prev) => list.find((b) => b.id === prev?.id) || list[0] || null);
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api]);

  async function toggleFavorite(id: string) {
    await api.business.favorite(id);
    await load();
  }

  async function submitReview(e: FormEvent) {
    e.preventDefault();
    if (!active) return;
    await api.business.review(active.id, rating, comment);
    setComment("");
    await load();
  }

  return (
    <ModuleShell
      moduleId="business"
      title="Business Hub"
      description="Verified kingdom businesses, products, services, reviews, and favorites."
    >
      <FadeIn>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <section className="space-y-3">
            {businesses.map((b) => (
              <button
                key={b.id}
                onClick={() => setActive(b)}
                className={`rv-card block w-full p-4 text-left transition duration-rv ${
                  active?.id === b.id ? "border-gold-500" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-lg">{b.name}</p>
                    <p className="text-xs text-[var(--rv-ink-muted)]">
                      {b.category_name} · {b.city}, {b.country}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    {b.verified && <p className="font-semibold text-gold-500">Verified</p>}
                    {b.featured && <p className="text-purple-500">Featured</p>}
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--rv-ink-muted)] line-clamp-2">{b.description}</p>
                <p className="mt-2 text-xs text-gold-500">
                  ★ {b.rating_avg.toFixed(1)} · {b.review_count} reviews
                </p>
              </button>
            ))}
          </section>

          <section className="rv-card p-5">
            {active ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-3xl">{active.name}</h2>
                    <p className="mt-1 text-sm text-[var(--rv-ink-muted)]">{active.description}</p>
                  </div>
                  <button className="rv-btn-ghost" onClick={() => toggleFavorite(active.id)}>
                    {active.is_favorite ? "★ Saved" : "☆ Save"}
                  </button>
                </div>

                <h3 className="font-display mt-6 text-lg">Products & services</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(active.products || []).map((p) => (
                    <div key={p.id} className="rounded-[12px] border border-[var(--rv-border)] p-3">
                      <p className="font-medium">{p.title}</p>
                      <p className="mt-1 text-xs text-[var(--rv-ink-muted)]">
                        {p.is_service ? "Service" : "Product"} · ${(p.price_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {!active.products?.length && <p className="text-sm text-[var(--rv-ink-muted)]">No listings yet.</p>}
                </div>

                <h3 className="font-display mt-6 text-lg">Leave a review</h3>
                <form onSubmit={submitReview} className="mt-3 space-y-3">
                  <select className="rv-input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} stars
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="rv-input min-h-[90px]"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience…"
                  />
                  <button className="rv-btn-primary" type="submit">
                    Submit review
                  </button>
                </form>
              </>
            ) : (
              <p className="text-[var(--rv-ink-muted)]">Select a business.</p>
            )}
          </section>
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
