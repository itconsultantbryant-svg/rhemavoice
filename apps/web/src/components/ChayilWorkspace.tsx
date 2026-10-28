"use client";

import Link from "next/link";
import { Bell, ChevronLeft, GraduationCap, LogOut } from "lucide-react";
import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export function ChayilWorkspace({ children, backHref, backLabel = "Rhema Academy" }: { children: ReactNode; backHref?: string; backLabel?: string }) {
  const { logout, user } = useAuth();
  const name = user?.display_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "CCI member";
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <div className="chayil-workspace min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-purple-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/academy/chayil/cci" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-purple-950 via-purple-900 to-purple-800 text-amber-300"><GraduationCap className="h-5 w-5" /></span>
          <span className="min-w-0"><span className="block truncate text-sm font-bold text-purple-950">CCI Command Center</span><span className="block truncate text-xs text-purple-700">Chayil Company Intensive</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/notifications" className="rounded-lg p-2 text-purple-700 hover:bg-purple-50" aria-label="Notifications"><Bell className="h-4 w-4" /></Link>
          <span className="hidden text-right sm:block"><span className="block text-sm font-medium text-slate-700">{name}</span><span className="block text-[11px] text-slate-500">Chayil participant</span></span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-purple-100 text-xs font-bold text-purple-800">{initials}</span>
          <button onClick={() => void logout()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
      {backHref && <Link href={backHref} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-purple-700 hover:text-purple-950"><ChevronLeft className="h-4 w-4" />{backLabel}</Link>}
      {children}
    </main>
  </div>;
}
