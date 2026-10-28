"use client";

import { FadeIn } from "@rhemavoice/ui";
import { FormEvent, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAuth } from "@/lib/auth";

type Content = { id: string; slug: string; title: string; module: string; summary: string; media_url: string; status: string };
const blank = { module: "platform", slug: "", title: "", summary: "", media_url: "", status: "draft", body: {} };

export default function ContentPage() {
  const { api } = useAuth();
  const [items, setItems] = useState<Content[]>([]);
  const [form, setForm] = useState<Record<string, unknown>>(blank);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const load = () => api.admin.content().then((rows) => setItems(rows as Content[]));
  useEffect(() => { load().catch(() => setMessage("Unable to load content.")); }, [api]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try { await api.admin.createContent(form); setForm(blank); await load(); setMessage("Content saved. Published entries are live immediately."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save content."); }
    finally { setSaving(false); }
  }
  async function status(item: Content, value: string) { await api.admin.updateContent(item.id, { status: value }); await load(); }

  return <AdminShell><div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10"><FadeIn>
    <h1 className="font-display text-3xl">Content publishing</h1><p className="mt-2 text-sm text-[var(--rv-ink-muted)]">Create drafts, publish live content, and attach a media/CDN URL. Every change is audited.</p>
    <form onSubmit={submit} className="rv-card mt-6 grid gap-3 p-5 md:grid-cols-2">
      {(["module", "slug", "title", "summary", "media_url"] as const).map((key) => <input key={key} required={key === "slug" || key === "title"} className="rv-input" placeholder={key.replace("_", " ")} value={String(form[key] ?? "")} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />)}
      <select className="rv-input" value={String(form.status)} onChange={(e) => setForm({ ...form, status: e.target.value })}>{["draft", "published"].map((s) => <option key={s}>{s}</option>)}</select>
      <button disabled={saving} className="rv-btn-primary md:col-span-2">{saving ? "Saving…" : "Save content"}</button>
    </form>{message && <p className="mt-3 text-sm text-gold-500">{message}</p>}
    <div className="mt-6 space-y-3">{items.map((item) => <div className="rv-card flex flex-wrap items-center justify-between gap-3 p-4" key={item.id}><div><p className="font-medium">{item.title}</p><p className="text-xs text-[var(--rv-ink-muted)]">{item.module} · /{item.slug} · {item.status}</p></div><div className="flex gap-2"><button className="rv-btn-ghost text-xs" onClick={() => status(item, item.status === "published" ? "draft" : "published")}>{item.status === "published" ? "Unpublish" : "Publish"}</button><button className="rv-btn-ghost text-xs" onClick={() => api.admin.deleteContent(item.id).then(load)}>Delete</button></div></div>)}</div>
  </FadeIn></div></AdminShell>;
}
