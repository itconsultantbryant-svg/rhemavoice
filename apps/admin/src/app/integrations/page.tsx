"use client";

import { FadeIn } from "@rhemavoice/ui";
import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAuth } from "@/lib/auth";

export default function IntegrationsPage() {
  const { api } = useAuth(); const [items, setItems] = useState<Array<{ key: string; config: Record<string, unknown> }>>([]); const [key, setKey] = useState(""); const [config, setConfig] = useState('{"enabled": false}'); const [message, setMessage] = useState("");
  const load = useCallback(() => api.admin.integrations().then(setItems), [api]);
  useEffect(() => { load().catch(() => setMessage("Unable to load integrations.")); }, [load]);
  async function submit(event: FormEvent) { event.preventDefault(); try { await api.admin.updateIntegration(key, JSON.parse(config)); setKey(""); await load(); setMessage("Integration configuration saved and audited."); } catch { setMessage("Use a valid key and JSON configuration."); } }
  return <AdminShell><div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10"><FadeIn><h1 className="font-display text-3xl">Integrations</h1><p className="mt-2 text-sm text-[var(--rv-ink-muted)]">Manage non-secret integration settings in real time. Provider secrets must remain in deployment environment variables.</p><form className="rv-card mt-6 grid gap-3 p-5" onSubmit={submit}><input className="rv-input" required placeholder="provider key, e.g. storage" value={key} onChange={(e) => setKey(e.target.value)} /><textarea className="rv-input min-h-28" value={config} onChange={(e) => setConfig(e.target.value)} /><button className="rv-btn-primary">Save integration</button></form>{message && <p className="mt-3 text-sm text-gold-500">{message}</p>}<div className="mt-6 space-y-3">{items.map((item) => <div key={item.key} className="rv-card p-4"><p className="font-medium">{item.key}</p><pre className="mt-2 overflow-auto text-xs text-[var(--rv-ink-muted)]">{JSON.stringify(item.config, null, 2)}</pre></div>)}</div></FadeIn></div></AdminShell>;
}
