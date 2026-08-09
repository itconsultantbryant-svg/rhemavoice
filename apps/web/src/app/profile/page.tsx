"use client";

import { FadeIn } from "@rhemavoice/ui";
import { BRAND, displayName, type Role } from "@rhemavoice/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

const ROLE_LABELS: Record<string, string> = {
  general_user: "General User",
  member: "Member",
  student: "Student",
  teacher: "Teacher",
  pastor: "Pastor",
  church_admin: "Church Admin",
  academy_admin: "Academy Admin",
  radio_admin: "Radio Admin",
  business_admin: "Business Admin",
  employer: "Employer",
  job_seeker: "Job Seeker",
  event_organizer: "Event Organizer",
  travel_partner: "Travel Partner",
  transport_partner: "Transport Partner",
  platform_admin: "Platform Admin",
  super_admin: "Super Admin",
  moderator: "Moderator",
  support_agent: "Support Agent",
  finance_officer: "Finance Officer",
};

const MENU = [
  { icon: "🪪", label: "My Profile", href: "/settings" },
  { icon: "📚", label: "My Courses", href: "/academy" },
  { icon: "🎙️", label: "My Rooms", href: "/rooms" },
  { icon: "🎟️", label: "My Bookings", href: "/ticketing" },
  { icon: "💼", label: "My Applications", href: "/opportunities" },
  { icon: "👛", label: "Wallet", href: "/wallet" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
  { icon: "🆘", label: "Help & Support", href: "/notifications" },
];

const STATS = [
  { value: "—", label: "Following" },
  { value: "—", label: "Followers" },
  { value: "—", label: "Courses" },
  { value: "—", label: "Certificates" },
];

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center text-[var(--rv-ink-muted)]">Loading…</main>
    );
  }

  const name = displayName(user);
  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "RV";

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <FadeIn>
          <p className="text-sm uppercase tracking-[0.22em] text-gold-500">{BRAND.name}</p>
          <h1 className="font-display mt-1 text-3xl md:text-4xl">Profile</h1>

          {/* Profile header */}
          <section className="rv-card mt-8 flex flex-col items-center p-8">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={name}
                className="h-24 w-24 rounded-full border-2 border-gold-500/50 object-cover"
              />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold-500/50 bg-[var(--rv-purple-900)] font-display text-3xl font-bold text-[var(--rv-gold-300)]">
                {initials}
              </span>
            )}
            <h2 className="font-display mt-4 text-2xl font-extrabold">{name}</h2>
            <p className="mt-0.5 text-sm text-[var(--rv-ink-muted)]">{user.email}</p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {user.roles.slice(0, 3).map((r: Role) => (
                <span
                  key={r}
                  className="rounded-full bg-gold-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-gold-500"
                >
                  {ROLE_LABELS[r] || r}
                </span>
              ))}
            </div>
          </section>

          {/* Stats row */}
          <section className="mt-4 grid grid-cols-4 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="rv-card flex flex-col items-center p-4">
                <span className="text-lg font-extrabold text-gold-500">{s.value}</span>
                <span className="mt-1 text-center text-[10px] text-[var(--rv-ink-muted)]">{s.label}</span>
              </div>
            ))}
          </section>

          {user.bio && (
            <section className="rv-card mt-4 p-5 text-sm leading-relaxed text-[var(--rv-ink-muted)]">
              {user.bio}
            </section>
          )}

          {/* Menu */}
          <section className="rv-card mt-6 overflow-hidden">
            {MENU.map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 transition hover:bg-white/5 ${
                  i < MENU.length - 1 ? "border-b border-[var(--rv-border)]" : ""
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="flex-1 text-[15px] font-semibold">{item.label}</span>
                <span className="text-[var(--rv-ink-muted)]">›</span>
              </Link>
            ))}
          </section>

          <p className="mt-8 text-center text-xs text-[var(--rv-ink-muted)]">
            {BRAND.developer} · v0.1.0
          </p>
        </FadeIn>
      </main>
    </AppShell>
  );
}
