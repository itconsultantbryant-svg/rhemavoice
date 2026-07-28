"use client";

import { FadeIn, Pressable, brand } from "@rhemavoice/ui";
import Link from "next/link";
import { RhemaLogo, LoadingCover } from "@/components/Brand";

export default function WelcomePage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-4xl gap-8 px-6 py-12 md:grid-cols-2 md:items-center">
      <FadeIn>
        <RhemaLogo size="lg" showWordmark priority href={undefined} />
        <p className="mt-6 text-sm uppercase tracking-[0.28em] text-gold-500">{brand.tagline}</p>
        <h1 className="font-display mt-3 text-4xl text-[var(--rv-ink)]">Your Rhema journey starts here</h1>
        <p className="mt-4 text-[var(--rv-ink-muted)]">
          Connect, worship, learn, and grow — Church Streaming, Rhema Academy, Live Radio, Rhema Rooms,
          Opportunities, and more on one platform.
        </p>
        <p className="mt-2 text-sm text-gold-500">{brand.developer}</p>
        <div className="mt-10 space-y-3">
          <Pressable>
            <Link href="/login" className="rv-btn-primary block w-full text-center">
              Continue to login
            </Link>
          </Pressable>
          <Link href="/" className="rv-btn-ghost block w-full text-center">
            Back
          </Link>
        </div>
      </FadeIn>
      <FadeIn delay={0.06} className="relative h-[420px]">
        <LoadingCover className="absolute inset-0" />
      </FadeIn>
    </main>
  );
}
