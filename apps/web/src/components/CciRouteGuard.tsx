"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

/** Prevent CCI sub-pages from making protected requests before CCI sign-in. */
export function CciRouteGuard({ children }: { children: React.ReactNode }) {
  const { code } = useParams<{ code: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { hasCciAccessToken } = useAuth();
  const entryPath = `/academy/${code}/cci`;
  const isEntry = pathname === entryPath || pathname === `${entryPath}/`;
  const authorized = hasCciAccessToken(code);

  useEffect(() => {
    if (!isEntry && !authorized) router.replace(entryPath);
  }, [authorized, entryPath, isEntry, router]);

  if (!isEntry && !authorized) return <main className="grid min-h-screen place-items-center px-4 text-center text-sm text-slate-600">Opening CCI sign-in…</main>;
  return <>{children}</>;
}
