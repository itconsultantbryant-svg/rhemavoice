"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/users", label: "Users" },
  { href: "/roles", label: "Roles" },
  { href: "/toggles", label: "Feature Toggles" },
  { href: "/audit", label: "Audit Logs" },
];

const MODULE_NAV = [
  { href: "/modules/streaming", label: "Streaming" },
  { href: "/modules/academy", label: "Academy" },
  { href: "/modules/learn", label: "Learn" },
  { href: "/modules/radio", label: "Radio" },
  { href: "/modules/business", label: "Business" },
  { href: "/modules/rooms", label: "Rooms" },
  { href: "/modules/opportunities", label: "Opportunities" },
  { href: "/modules/transport", label: "Transport" },
  { href: "/modules/ticketing", label: "E-Ticketing" },
  { href: "/modules/air", label: "RhemaAir" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({ item, pathname }: { item: { href: string; label: string }; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={clsx(
        "block rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-gold-500/12 font-semibold text-[var(--rv-gold-300)]"
          : "text-[var(--rv-ink-muted)] hover:bg-white/5 hover:text-[var(--rv-ink)]"
      )}
    >
      {item.label}
    </Link>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[var(--rv-border)] bg-[var(--rv-purple-950)]/95 px-4 py-6 backdrop-blur-md md:flex">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/rhemavoice_logo.jpeg" alt="" className="h-10 w-10 rounded-full object-cover" />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gold-500">Super Admin</p>
            <h1 className="font-display text-xl">RhemaVoice</h1>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rv-ink-muted)]">
            Console
          </p>
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <nav className="mt-6 space-y-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rv-ink-muted)]">
            Modules
          </p>
          {MODULE_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <button
          className="mt-auto rounded-lg px-3 py-2 text-left text-sm text-[var(--rv-ink-muted)] transition hover:bg-white/5 hover:text-[var(--rv-ink)]"
          onClick={() => logout().then(() => router.replace("/"))}
        >
          Log out
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--rv-border)] bg-[var(--rv-purple-950)]/95 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/rhemavoice_logo.jpeg" alt="" className="h-8 w-8 rounded-full object-cover" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold-500">Admin</p>
              <h1 className="font-display text-sm leading-tight">RhemaVoice</h1>
            </div>
          </div>
          <button
            className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--rv-ink-muted)] transition hover:bg-white/5"
            onClick={() => logout().then(() => router.replace("/"))}
          >
            Log out
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {[...NAV, ...MODULE_NAV].map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-gold-500/15 text-[var(--rv-gold-300)]"
                    : "text-[var(--rv-ink-muted)] hover:bg-white/5"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Content */}
      <main className="md:pl-60">
        <div className="min-h-screen pb-16 md:pb-0">{children}</div>
      </main>
    </div>
  );
}
