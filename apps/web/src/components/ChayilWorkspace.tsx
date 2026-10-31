"use client";

import Link from "next/link";
import { Bell, BookOpen, CalendarDays, ChevronLeft, ClipboardList, GraduationCap, Home, Library, LifeBuoy, LogOut, Menu, Settings, UsersRound, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export function ChayilWorkspace({ children, backHref, backLabel = "Rhema Academy" }: { children: ReactNode; backHref?: string; backLabel?: string }) {
  const { logout, user, api } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState("student");
  const name = user?.display_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "CCI member";
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  async function signOut() {
    await logout();
    router.replace("/login");
  }
  useEffect(() => { api.academy.cciWorkspace("chayil").then((data) => setRole(String((data as { role?: string }).role || "student"))).catch(() => undefined); }, [api]);
  const base = "/academy/chayil/cci";
  const links: Array<[LucideIcon, string, string]> = role === "administrator" ? [
    [Home, "Overview", base], [UsersRound, "People & access", `${base}/members`], [BookOpen, "Learning operations", `${base}/learning`], [Library, "Curriculum library", `${base}/resources`], [CalendarDays, "Calendar", `${base}/calendar`], [ClipboardList, "Reports", `${base}/reports`],
  ] : role === "teacher" ? [
    [Home, "Overview", base], [BookOpen, "My teaching", `${base}/teacher`], [ClipboardList, "Gradebook", `${base}/gradebook`], [CalendarDays, "Calendar", `${base}/calendar`], [LifeBuoy, "Support", `${base}/support`],
  ] : role === "advisor" ? [
    [Home, "Overview", base], [UsersRound, "My mentees", `${base}/mentees`], [CalendarDays, "Calendar", `${base}/calendar`], [LifeBuoy, "Support", `${base}/support`],
  ] : [
    [Home, "Overview", base], [BookOpen, "My learning", `${base}/student-learning`], [ClipboardList, "My grades", `${base}/gradebook`], [CalendarDays, "Calendar", `${base}/calendar`], [Library, "Resources", `${base}/resources`], [LifeBuoy, "Support", `${base}/support`],
  ];
  const sidebar = <nav className="space-y-1" aria-label="CCI navigation"><p className="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{role === "administrator" ? "Administration" : "Learning"}</p>{links.map(([Icon, label, href]) => <Link key={String(label)} href={String(href)} onClick={() => setMenuOpen(false)} className="chayil-nav-link"><Icon className="h-4 w-4" />{label}</Link>)}<p className="px-3 pb-2 pt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Program</p><Link href={`${base}/about`} onClick={() => setMenuOpen(false)} className="chayil-nav-link"><GraduationCap className="h-4 w-4" />About Chayil</Link><Link href="/settings" className="chayil-nav-link"><Settings className="h-4 w-4" />Account settings</Link></nav>;
  return <div className="chayil-workspace min-h-screen text-slate-900">
    <header className="chayil-header"><div className="flex h-[72px] items-center justify-between gap-3 px-4 lg:px-6"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-purple-800 hover:bg-purple-50 lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button><Link href={base} className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F3EEFF] text-[#6D28D9]"><GraduationCap className="h-5 w-5" /></span><span className="min-w-0"><span className="block truncate text-sm font-bold text-[#321044]">ABC Chayil</span><span className="block truncate text-xs text-slate-500">RhemaAcademy · CCI Command Center</span></span></Link></div><div className="flex items-center gap-2"><Link href="/notifications" className="rounded-lg p-2 text-purple-700 hover:bg-purple-50" aria-label="Notifications"><Bell className="h-4 w-4" /></Link><span className="hidden text-right sm:block"><span className="block text-sm font-semibold text-slate-700">{name}</span><span className="block text-[11px] capitalize text-slate-500">{role} workspace</span></span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#F3EEFF] text-xs font-bold text-[#6D28D9]">{initials}</span><button onClick={() => void signOut()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Sign out of CCI and RhemaVoice"><LogOut className="h-4 w-4" /></button></div></div></header>
    <aside className="chayil-sidebar hidden lg:block"><div className="p-4">{sidebar}</div></aside>
    {menuOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/30" onClick={() => setMenuOpen(false)} aria-label="Close navigation" /><aside className="relative h-full w-[min(290px,85vw)] bg-white p-4 shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 pb-3"><strong className="text-[#321044]">CCI Command Center</strong><button onClick={() => setMenuOpen(false)} className="rounded-lg p-2"><X className="h-5 w-5" /></button></div>{sidebar}</aside></div>}
    <main className="chayil-main"><div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">{backHref && <Link href={backHref} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#6D28D9] hover:text-[#321044]"><ChevronLeft className="h-4 w-4" />{backLabel}</Link>}{children}</div></main>
  </div>;
}
