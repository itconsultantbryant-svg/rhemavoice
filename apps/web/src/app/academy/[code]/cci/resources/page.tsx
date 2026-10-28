"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChayilWorkspace } from "@/components/ChayilWorkspace";
import { useAuth } from "@/lib/auth";

type Resource = { id: string; title: string; description: string; category: string; access_level: string; status: string; file_status: string };
type Payload = { storage_enabled: boolean; can_manage: boolean; can_review: boolean; resources: Resource[] };

export default function CCIResourcesPage() {
  const { code } = useParams<{ code: string }>(); const { api } = useAuth();
  const [data, setData] = useState<Payload | null>(null); const [error, setError] = useState(""); const [title, setTitle] = useState("");
  const load = useCallback(async () => { try { setData(await api.academy.cciResources(code) as unknown as Payload); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load resources."); } }, [api, code]);
  useEffect(() => { void load(); }, [load]);
  async function create(e: React.FormEvent) { e.preventDefault(); if (!title.trim()) return; await api.academy.createCciResource(code, { title }); setTitle(""); await load(); }
  async function submit(id: string) { await api.academy.submitCciResource(code, id); await load(); }
  async function review(id: string, status: "approved" | "rejected") { await api.academy.reviewCciResource(code, id, status); await load(); }
  return <ChayilWorkspace backHref={`/academy/${code}/cci`}><main className="mx-auto max-w-4xl px-4 py-6 md:px-6"><Link href={`/academy/${code}/cci`} className="text-sm text-[var(--rv-ink-muted)]">← CCI Command Center</Link><h1 className="font-display mt-4 text-3xl">Resources & approvals</h1><p className="mt-1 text-sm text-[var(--rv-ink-muted)]">Private file delivery remains unavailable until secure storage is configured.</p>{error && <p className="mt-6 text-sm text-[var(--rv-danger)]">{error}</p>}{data && <><p className="mt-4 text-sm text-gold-500">Storage: {data.storage_enabled ? "configured" : "pending configuration"}</p>{data.can_manage && <form className="rv-card mt-4 flex flex-wrap gap-3 p-4" onSubmit={create}><input className="rv-input min-w-56 flex-1" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title"/><button className="rv-btn-primary">Create draft</button></form>}<div className="mt-4 space-y-3">{data.resources.map((resource) => <section className="rv-card flex flex-wrap items-center justify-between gap-3 p-4" key={resource.id}><div><p className="font-medium">{resource.title}</p><p className="text-xs text-[var(--rv-ink-muted)]">{resource.category} · {resource.access_level} · {resource.status} · {resource.file_status.replaceAll("_", " ")}</p></div><div className="flex gap-2">{data.can_manage && ["draft", "rejected"].includes(resource.status) && <button className="rv-btn-ghost text-xs" onClick={() => submit(resource.id)}>Submit review</button>}{data.can_review && resource.status === "pending_review" && <><button className="rv-btn-ghost text-xs" onClick={() => review(resource.id, "approved")}>Approve</button><button className="rv-btn-ghost text-xs" onClick={() => review(resource.id, "rejected")}>Reject</button></>}</div></section>)}{!data.resources.length && <p className="text-sm text-[var(--rv-ink-muted)]">No resources have been created.</p>}</div></>}</main></ChayilWorkspace>;
}
