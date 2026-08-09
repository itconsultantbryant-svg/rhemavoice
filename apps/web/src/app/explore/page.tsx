"use client";

import { FadeIn } from "@rhemavoice/ui";
import { BRAND, type ModuleMeta } from "@rhemavoice/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { ModuleIcon } from "@/components/ModuleIcon";
import { useAuth } from "@/lib/auth";

const MODULE_ICONS: Record<string, string> = {
  streaming: "church",
  academy: "school",
  learn: "book-open-page-variant",
  radio: "radio",
  rooms: "microphone",
  business: "briefcase",
  opportunities: "target",
  transport: "car",
  ticketing: "ticket",
  air: "airplane",
};

const GROUPS = [
  {
    title: "Worship & Learning",
    subtitle: "Stream, study, and grow together",
    ids: ["streaming", "academy", "learn", "radio", "rooms"],
  },
  {
    title: "Marketplace & Travel",
    subtitle: "Do business, travel, and celebrate",
    ids: ["business", "opportunities", "transport", "ticketing", "air"],
  },
];

export default function ExplorePage() {
  const { user, api, loading } = useAuth();
  const router = useRouter();
  const [modules, setModules] = useState<ModuleMeta[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) api.modules.list().then(setModules);
  }, [user, api]);

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center text-[var(--rv-ink-muted)]">Loading…</main>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <FadeIn>
          <p className="text-sm uppercase tracking-[0.22em] text-gold-500">{BRAND.name}</p>
          <h1 className="font-display mt-1 text-3xl md:text-4xl">Explore</h1>
          <p className="mt-2 text-[var(--rv-ink-muted)]">Every kingdom service in one place</p>

          {GROUPS.map((group) => (
            <section key={group.title} className="mt-10">
              <h2 className="font-display text-xl">{group.title}</h2>
              <p className="mt-0.5 text-sm text-[var(--rv-ink-muted)]">{group.subtitle}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.ids
                  .map((id) => modules.find((m) => m.id === id))
                  .filter(Boolean)
                  .map((m) => (
                    <Link
                      key={m!.id}
                      href={m!.route}
                      className="rv-card group flex items-start gap-4 p-5 transition duration-rv hover:border-gold-500/50"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500 transition group-hover:bg-gold-500/20">
                        <ModuleIcon name={MODULE_ICONS[m!.id] || m!.icon} className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="font-display text-lg leading-snug">{m!.name}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--rv-ink-muted)]">{m!.description}</p>
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          ))}
        </FadeIn>
      </main>
    </AppShell>
  );
}
