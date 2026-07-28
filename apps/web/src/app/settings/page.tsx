"use client";

import { FadeIn } from "@rhemavoice/ui";
import type { ThemePreference } from "@rhemavoice/shared";
import {
  BarChart3,
  Bell,
  ChevronRight,
  Globe,
  LogOut,
  Monitor,
  Moon,
  MessageCircle,
  Palette,
  ShieldCheck,
  Sun,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", hint: "Bright and clear", Icon: Sun },
  { value: "dark", label: "Dark", hint: "Easy on the eyes", Icon: Moon },
  { value: "system", label: "System", hint: "Match your device", Icon: Monitor },
];

const LANGUAGES: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" },
  { value: "es", label: "Español" },
  { value: "sw", label: "Kiswahili" },
];

function SectionCard({
  title,
  description,
  Icon,
  children,
}: {
  title: string;
  description?: string;
  Icon: typeof Sun;
  children: React.ReactNode;
}) {
  return (
    <section className="rv-card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/10 text-gold-500">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="font-display text-xl leading-tight">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-[var(--rv-ink-muted)]">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition duration-rv ${
        checked ? "bg-gold-500" : "bg-navy-900/15 dark:bg-white/15"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-rv ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

const QUICK_LINKS = [
  { href: "/wallet", label: "Wallet", hint: "Balance, giving & top-ups", Icon: Wallet },
  { href: "/notifications", label: "Notifications", hint: "Alerts and updates", Icon: Bell },
  { href: "/chat", label: "Messages", hint: "Conversations and groups", Icon: MessageCircle },
  { href: "/analytics", label: "Analytics", hint: "Your insights", Icon: BarChart3 },
];

export default function SettingsPage() {
  const { user, loading, setTheme, refreshMe, logout, api } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState({ first_name: "", last_name: "", display_name: "", phone: "" });
  const [prefs, setPrefs] = useState({
    notify_email: true,
    notify_push: true,
    notify_sms: false,
    language: "en",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [savedPrefs, setSavedPrefs] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setProfile({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      display_name: user.display_name || "",
      phone: user.phone || "",
    });
    api.settings.preferences().then((p) => {
      setPrefs({
        notify_email: Boolean(p.notify_email ?? true),
        notify_push: Boolean(p.notify_push ?? true),
        notify_sms: Boolean(p.notify_sms ?? false),
        language: String(p.language || "en"),
      });
    });
  }, [user, api]);

  if (!user) return null;

  const initials = (user.display_name || `${user.first_name} ${user.last_name}` || user.email)
    .split(" ")
    .map((s) => s.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const memberSince = user.date_joined
    ? new Date(user.date_joined).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await api.auth.updateProfile(profile);
      await refreshMe();
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2000);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePrefs() {
    await api.settings.updatePreferences(prefs);
    setSavedPrefs(true);
    setTimeout(() => setSavedPrefs(false), 2000);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <FadeIn>
        <Link href="/dashboard" className="text-sm text-[var(--rv-ink-muted)]">
          ← Dashboard
        </Link>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 text-2xl font-semibold text-gold-300">
            {initials || "RV"}
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-4xl">Settings</h1>
            <p className="text-sm text-[var(--rv-ink-muted)]">{user.email}</p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <SectionCard title="Profile" description="Update how your name appears across RhemaVoice." Icon={UserIcon}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[var(--rv-ink-muted)]">First name</span>
                <input
                  className="rv-input mt-1"
                  value={profile.first_name}
                  onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--rv-ink-muted)]">Last name</span>
                <input
                  className="rv-input mt-1"
                  value={profile.last_name}
                  onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--rv-ink-muted)]">Display name</span>
                <input
                  className="rv-input mt-1"
                  value={profile.display_name}
                  onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--rv-ink-muted)]">Phone</span>
                <input
                  className="rv-input mt-1"
                  value={profile.phone}
                  inputMode="tel"
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-[var(--rv-ink-muted)]">Email</span>
                <input className="rv-input mt-1 opacity-60" value={user.email} disabled />
                <span className="mt-1 block text-xs text-[var(--rv-ink-muted)]">Email can’t be changed here.</span>
              </label>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button className="rv-btn-primary" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </button>
              {savedProfile && <span className="text-sm text-gold-500">Profile updated.</span>}
            </div>
          </SectionCard>

          <SectionCard title="Account" description="Your roles and membership details." Icon={ShieldCheck}>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-[var(--rv-ink-muted)]">Status</dt>
                <dd className={user.is_active ? "text-gold-500" : "text-[var(--rv-danger)]"}>
                  {user.is_active ? "Active" : "Suspended"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--rv-ink-muted)]">Member since</dt>
                <dd>{memberSince}</dd>
              </div>
              <div>
                <dt className="text-[var(--rv-ink-muted)]">Roles</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {(user.roles?.length ? user.roles : ["member"]).map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-[var(--rv-border)] px-3 py-1 text-xs capitalize"
                    >
                      {String(r).replace(/_/g, " ")}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Appearance" description="Preference is saved to your account." Icon={Palette}>
            <div className="grid gap-3 sm:grid-cols-3">
              {THEME_OPTIONS.map(({ value, label, hint, Icon }) => {
                const active = user.theme_preference === value;
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-start gap-2 rounded-[14px] border px-4 py-3 text-left transition duration-rv ${
                      active ? "border-gold-500 bg-gold-500/10" : "border-[var(--rv-border)] hover:border-gold-500/40"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-gold-500" strokeWidth={1.75} />
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-[var(--rv-ink-muted)]">{hint}</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Notifications" description="Choose how you want to hear from us." Icon={Bell}>
            <div className="divide-y divide-[var(--rv-border)]">
              {(
                [
                  ["notify_email", "Email alerts", "News, receipts and account activity"],
                  ["notify_push", "Push notifications", "Real-time alerts on your devices"],
                  ["notify_sms", "SMS alerts", "Critical updates via text message"],
                ] as const
              ).map(([key, label, hint]) => (
                <div key={key} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-[var(--rv-ink-muted)]">{hint}</p>
                  </div>
                  <Toggle checked={prefs[key]} onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Language & Region" description="Set your preferred language." Icon={Globe}>
            <label className="block text-sm">
              <span className="text-[var(--rv-ink-muted)]">Language</span>
              <select
                className="rv-input mt-1"
                value={prefs.language}
                onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value }))}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </SectionCard>

          <div className="flex items-center gap-3">
            <button className="rv-btn-primary" onClick={savePrefs}>
              Save preferences
            </button>
            {savedPrefs && <span className="text-sm text-gold-500">Preferences saved.</span>}
          </div>

          <SectionCard title="Quick access" description="Jump to the things you use most." Icon={ChevronRight}>
            <div className="grid gap-2 sm:grid-cols-2">
              {QUICK_LINKS.map(({ href, label, hint, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-[12px] border border-[var(--rv-border)] px-4 py-3 transition duration-rv hover:border-gold-500/50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/10 text-gold-500">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-[var(--rv-ink-muted)]">{hint}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--rv-ink-muted)]" />
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Session" description="Manage your sign-in on this device." Icon={LogOut}>
            <button
              className="rv-btn-ghost flex items-center gap-2 text-[var(--rv-danger)]"
              onClick={() => logout().then(() => router.replace("/"))}
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </SectionCard>
        </div>
      </FadeIn>
    </main>
  );
}
