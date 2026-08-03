"use client";

import { FadeIn } from "@rhemavoice/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChayilLogo, RhemaLogo } from "@/components/Brand";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Academy = {
  id: string;
  code: string;
  name: string;
  tagline: string;
  description: string;
  logo_key: string;
  program_weeks?: number;
  student_count?: number;
  is_featured?: boolean;
};

export default function AcademyChoosePage() {
  const { api, user } = useAuth();
  const [academies, setAcademies] = useState<Academy[]>([]);

  useEffect(() => {
    if (!user) return;
    api.academy.institutions().then((list) => setAcademies(list as Academy[])).catch(() => setAcademies([]));
  }, [api, user]);

  const featured = academies.find((a) => a.is_featured) || academies.find((a) => a.code === "chayil");
  const others = academies.filter((a) => a.id !== featured?.id);

  return (
    <ModuleShell
      moduleId="academy"
      title="Rhema Academy"
      description="Choose your academy. RhemaVoice hosts the platform — each organization runs its own program."
    >
      <FadeIn>
        <p className="mb-6 text-sm text-[var(--rv-ink-muted)]">
          RhemaVoice provides the secure learning infrastructure. Your academy manages curriculum, students, mentors,
          and certificates.
        </p>

        {featured && (
          <Link
            href={`/academy/${featured.code}`}
            className="rv-card mb-6 block overflow-hidden bg-gradient-to-br from-purple-900 to-navy-900 p-6 text-white transition hover:border-gold-500/50"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <ChayilLogo size="lg" onDark />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gold-300">Featured academy</p>
                  <h2 className="font-display mt-1 text-2xl md:text-3xl">{featured.name}</h2>
                  <p className="mt-1 text-sm text-white/80">{featured.tagline}</p>
                </div>
              </div>
              <span className="rv-btn bg-gold-500 text-navy-900">Enter Academy</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-gold-200">
              <span>{featured.program_weeks || 31} Weeks</span>
              <span>{featured.student_count || 0} Students</span>
              <span>Powered by RhemaVoice</span>
            </div>
          </Link>
        )}

        <h3 className="font-display mb-3 text-xl">Other academies</h3>
        <div className="space-y-3">
          {others.map((a) => (
            <Link
              key={a.id}
              href={`/academy/${a.code}`}
              className="rv-card flex items-center justify-between gap-4 p-4 transition hover:border-gold-500/40"
            >
              <div>
                <p className="font-display text-lg">{a.name}</p>
                <p className="text-sm text-[var(--rv-ink-muted)]">{a.tagline || a.description}</p>
              </div>
              <span className="text-sm text-gold-500">Enter →</span>
            </Link>
          ))}
          {!others.length && !featured && (
            <p className="text-sm text-[var(--rv-ink-muted)]">No academies available yet.</p>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3 text-xs text-[var(--rv-ink-muted)]">
          <RhemaLogo size="sm" href={undefined} />
          <span>Technology platform by RhemaVoice Technologies Inc.</span>
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
