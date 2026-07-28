"use client";

import Image from "next/image";
import Link from "next/link";
import { brand } from "@rhemavoice/ui";
import clsx from "clsx";

type Props = {
  href?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  priority?: boolean;
};

const sizes = {
  sm: 36,
  md: 48,
  lg: 72,
  xl: 112,
};

export function RhemaLogo({ href = "/", size = "md", showWordmark = false, className, priority }: Props) {
  const px = sizes[size];
  const content = (
    <span className={clsx("rv-brand-mark", className)}>
      <Image
        src="/brand/rhemavoice_logo.jpeg"
        alt={brand.name}
        width={px}
        height={px}
        className="rounded-full object-cover shadow-[0_0_24px_rgba(223,166,34,0.35)]"
        priority={priority}
      />
      {showWordmark && (
        <span className="leading-tight">
          <span className="block font-display text-lg font-semibold tracking-tight">
            <span className="text-[var(--rv-ink)]">Rhema</span>
            <span className="text-[var(--rv-gold-500)]">Voice</span>
          </span>
          <span className="block text-[10px] uppercase tracking-[0.22em] text-[var(--rv-ink-muted)]">
            {brand.tagline}
          </span>
        </span>
      )}
    </span>
  );
  if (href === null || href === undefined) return content;
  return (
    <Link href={href} className="inline-flex">
      {content}
    </Link>
  );
}

export function ChayilLogo({
  size = "md",
  className,
  showLabel = true,
  onDark = false,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
  onDark?: boolean;
}) {
  const px = sizes[size];
  return (
    <span className={clsx("inline-flex items-center gap-3", className)}>
      <Image
        src="/brand/chayil_logo.jpeg"
        alt={brand.academyInstitutionFull}
        width={px}
        height={px}
        className="rounded-2xl object-cover shadow-[var(--rv-shadow)]"
      />
      {showLabel && (
        <span className="leading-tight">
          <span className={clsx("block text-xs uppercase tracking-[0.2em]", onDark ? "text-gold-300" : "text-[var(--rv-gold-500)]")}>
            Institution
          </span>
          <span className={clsx("font-display text-lg font-semibold", onDark ? "text-white" : "text-[var(--rv-ink)]")}>
            {brand.academyInstitution}
          </span>
          <span className={clsx("block text-xs", onDark ? "text-white/70" : "text-[var(--rv-ink-muted)]")}>
            Under Rhema Academy
          </span>
        </span>
      )}
    </span>
  );
}

export function LoadingCover({ className }: { className?: string }) {
  return (
    <div className={clsx("relative overflow-hidden rounded-[18px]", className)}>
      <Image
        src="/brand/loading_cover.jpeg"
        alt={`${brand.name} — ${brand.tagline}`}
        fill
        className="object-cover"
        priority
        sizes="(max-width: 768px) 100vw, 480px"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--rv-purple-950)]/80 to-transparent p-4">
        <p className="text-center text-xs tracking-wide text-white/90">{brand.footer}</p>
      </div>
    </div>
  );
}
