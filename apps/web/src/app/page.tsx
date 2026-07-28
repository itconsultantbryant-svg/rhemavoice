"use client";

import { FadeIn } from "@rhemavoice/ui";
import { BRAND } from "@rhemavoice/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RhemaLogo, LoadingCover } from "@/components/Brand";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-end px-6 pb-16 pt-10 md:grid md:grid-cols-2 md:items-center md:justify-center md:gap-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-[520px] w-[520px] rounded-full bg-gold-500/20 blur-3xl" />
      </div>
      <FadeIn>
        <RhemaLogo size="lg" showWordmark priority href={undefined} />
        <h1 className="font-display mt-8 max-w-xl text-4xl leading-tight text-[var(--rv-ink)] md:text-6xl">
          {BRAND.tagline}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[var(--rv-ink-muted)]">
          {BRAND.description}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/welcome" className="rv-btn-primary">
            Begin
          </Link>
          <Link href="/login" className="rv-btn-ghost">
            Sign in
          </Link>
        </div>
      </FadeIn>
      <FadeIn delay={0.08} className="relative mt-10 hidden h-[520px] md:mt-0 md:block">
        <LoadingCover className="absolute inset-0" />
      </FadeIn>
    </main>
  );
}
