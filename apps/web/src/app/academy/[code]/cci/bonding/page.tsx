"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChayilWorkspace } from "@/components/ChayilWorkspace";
import { useAuth } from "@/lib/auth";

type Post = { id: string; body: string; status: string; is_mine: boolean; author: string; created_at: string };
type Feed = { can_moderate: boolean; posts: Post[] };
export default function BondingCornerPage() {
  const { code } = useParams<{ code: string }>(); const { api } = useAuth(); const [feed, setFeed] = useState<Feed | null>(null); const [body, setBody] = useState(""); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setFeed(await api.academy.cciBondingPosts(code) as unknown as Feed); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load Bonding Corner."); } }, [api, code]);
  useEffect(() => { void load(); }, [load]);
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!body.trim()) return; await api.academy.createCciBondingPost(code, body); setBody(""); await load(); }
  async function moderate(id: string, status: "approved" | "rejected") { await api.academy.moderateCciBondingPost(code, id, status); await load(); }
  return <ChayilWorkspace backHref={`/academy/${code}/cci`}><main className="mx-auto max-w-4xl px-4 py-6 md:px-6"><Link href={`/academy/${code}/cci`} className="text-sm text-[var(--rv-ink-muted)]">← CCI Command Center</Link><h1 className="font-display mt-4 text-3xl">Bonding Corner</h1><p className="mt-1 text-sm text-[var(--rv-ink-muted)]">Encouragement and program connection. Posts are reviewed before participant visibility.</p>{error && <p className="mt-5 text-sm text-[var(--rv-danger)]">{error}</p>}<form className="rv-card mt-5 space-y-3 p-4" onSubmit={submit}><textarea required className="rv-input min-h-24" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share an appropriate CCI update or encouragement…"/><button className="rv-btn-primary">Submit for review</button></form><div className="mt-5 space-y-3">{feed?.posts.map((post) => <article className="rv-card p-4" key={post.id}><p className="text-sm">{post.body}</p><p className="mt-2 text-xs text-[var(--rv-ink-muted)]">{post.author} · {new Date(post.created_at).toLocaleString()} · <span className="capitalize">{post.status}</span></p>{feed.can_moderate && post.status === "pending" && <div className="mt-3 flex gap-2"><button className="rv-btn-ghost text-xs" onClick={() => moderate(post.id, "approved")}>Approve</button><button className="rv-btn-ghost text-xs" onClick={() => moderate(post.id, "rejected")}>Reject</button></div>}</article>)}{feed && !feed.posts.length && <p className="text-sm text-[var(--rv-ink-muted)]">No posts yet.</p>}</div></main></ChayilWorkspace>;
}
