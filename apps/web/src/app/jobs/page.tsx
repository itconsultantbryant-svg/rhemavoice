"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — Jobs now live under Opportunities. */
export default function JobsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/opportunities?type=job");
  }, [router]);
  return (
    <main className="grid min-h-screen place-items-center text-sm text-[var(--rv-ink-muted)]">
      Redirecting to Opportunities…
    </main>
  );
}
