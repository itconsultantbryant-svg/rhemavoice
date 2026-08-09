"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth";
import { RhemaLogo } from "./Brand";

/* ── Navigation items ─────────────────────────────────── */

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { label: "Explore", href: "/explore", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
  { label: "Rooms", href: "/rooms", icon: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M9 11V7a3 3 0 016 0v4" },
  { label: "Alerts", href: "/notifications", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { label: "Profile", href: "/profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

/* ── SVG icon helper ──────────────────────────────────── */

function NavIcon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

/* ── Mobile bottom tab ────────────────────────────────── */

function MobileTabBar({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center border-t border-[var(--rv-border)] bg-[var(--rv-purple-950)]/95 backdrop-blur-md md:hidden">
      <div className="mx-auto grid w-full max-w-md grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname === "/") ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors",
                active
                  ? "text-[var(--rv-gold-400)]"
                  : "text-[var(--rv-ink-muted)] hover:text-[var(--rv-ink)]"
              )}
            >
              <NavIcon d={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ── Desktop top navbar ───────────────────────────────── */

function DesktopNavBar({
  pathname,
  userInitials,
  userName,
}: {
  pathname: string;
  userInitials: string;
  userName: string;
}) {
  const { logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 hidden border-b border-[var(--rv-border)] bg-[var(--rv-purple-950)]/90 backdrop-blur-md md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2.5">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="inline-flex">
            <RhemaLogo size="sm" href={null} />
          </Link>
          <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href === "/dashboard" && pathname === "/") ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--rv-gold-500)]/12 text-[var(--rv-gold-400)]"
                      : "text-[var(--rv-ink-muted)] hover:bg-white/5 hover:text-[var(--rv-ink)]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="relative flex items-center gap-3">
          <Link
            href="/notifications"
            className="rounded-lg p-2 text-[var(--rv-ink-muted)] transition hover:bg-white/5 hover:text-[var(--rv-ink)]"
            aria-label="Notifications"
          >
            <NavIcon d={NAV_ITEMS[3].icon} className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-[var(--rv-ink-muted)] transition hover:bg-white/5 hover:text-[var(--rv-ink)]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--rv-purple-800)] text-[10px] font-bold text-[var(--rv-gold-300)]">
              {userInitials}
            </span>
            <span className="hidden lg:inline">{userName}</span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--rv-border)] bg-[var(--rv-purple-900)] shadow-2xl">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-[var(--rv-ink)] hover:bg-white/5"
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm text-[var(--rv-ink)] hover:bg-white/5"
                >
                  Settings
                </Link>
                <button
                  onClick={() =>
                    logout().then(() => {
                      setMenuOpen(false);
                      router.replace("/login");
                    })
                  }
                  className="w-full border-t border-[var(--rv-border)] px-4 py-2.5 text-left text-sm text-[var(--rv-ink-muted)] hover:bg-white/5"
                >
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── Main shell ───────────────────────────────────────── */

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "RV"
    : "RV";
  const name = user?.display_name || `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Member";

  return (
    <>
      <DesktopNavBar pathname={pathname} userInitials={initials} userName={name} />
      <MobileTabBar pathname={pathname} />
      <div className="pt-14 md:pt-14 pb-20 md:pb-0">{children}</div>
    </>
  );
}
