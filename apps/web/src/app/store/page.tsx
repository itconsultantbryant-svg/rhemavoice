"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type StoreProduct = {
  id: string;
  title: string;
  description: string;
  price_cents: number;
  sku: string;
  category: string;
  is_featured: boolean;
};

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "books", label: "Books" },
  { key: "apparel", label: "Apparel" },
  { key: "accessories", label: "Accessories" },
  { key: "digital", label: "Digital" },
  { key: "gift_card", label: "Gift Cards" },
];

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export default function StorePage() {
  const { api, user } = useAuth();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [category, setCategory] = useState("");

  async function load() {
    setProducts((await api.store.products(category || undefined)) as unknown as StoreProduct[]);
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api, category]);

  return (
    <ModuleShell
      moduleId="store"
      title="Kingdom Brand Store"
      description="Official RhemaVoice merch, books, and gifts."
    >
      <FadeIn>
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={category === c.key ? "rv-btn-primary" : "rv-btn-ghost"}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="rv-card flex flex-col p-4">
              <div className="flex items-start justify-between">
                <p className="font-display text-lg">{p.title}</p>
                {p.is_featured && <span className="text-xs text-purple-500">Featured</span>}
              </div>
              <p className="text-xs text-[var(--rv-ink-muted)]">SKU {p.sku}</p>
              {p.description && (
                <p className="mt-2 flex-1 text-sm text-[var(--rv-ink-muted)] line-clamp-2">{p.description}</p>
              )}
              <span className="mt-3 font-display text-lg">{money(p.price_cents)}</span>
            </div>
          ))}
          {!products.length && <p className="text-[var(--rv-ink-muted)]">No products in this category.</p>}
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
