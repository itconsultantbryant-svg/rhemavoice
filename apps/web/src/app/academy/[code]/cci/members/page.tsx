"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

type Member = { id: string; name: string; email: string; membership_role: string; cci_roles: string[] };
const ROLES = ["founder", "program_director", "curriculum_director", "administration", "formation_coordinator", "technology_director", "communications_director", "instructor", "mentor", "student"];

export default function CCIMembersPage() {
  const { code } = useParams<{ code: string }>(); const { api } = useAuth();
  const [members, setMembers] = useState<Member[]>([]); const [error, setError] = useState("");
  const load = async () => { try { setMembers(await api.academy.cciMembers(code) as unknown as Member[]); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load CCI members."); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [api, code]);
  async function assign(userId: string, role: string) { await api.academy.assignCciRole(code, userId, role); await load(); }
  async function revoke(userId: string, role: string) { await api.academy.revokeCciRole(code, userId, role); await load(); }
  return <AppShell><main className="mx-auto max-w-4xl px-4 py-6 md:px-6"><Link href={`/academy/${code}/cci`} className="text-sm text-[var(--rv-ink-muted)]">← CCI Command Center</Link><h1 className="font-display mt-4 text-3xl">CCI role assignments</h1><p className="mt-1 text-sm text-[var(--rv-ink-muted)]">Roles attach to existing Chayil members; this never creates another account.</p>{error && <p className="mt-6 text-sm text-[var(--rv-danger)]">{error}</p>}<div className="mt-6 space-y-3">{members.map((member) => <section className="rv-card p-4" key={member.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{member.name}</p><p className="text-xs text-[var(--rv-ink-muted)]">{member.email} · Academy: {member.membership_role}</p><div className="mt-2 flex flex-wrap gap-2">{member.cci_roles.map((role) => <button key={role} onClick={() => revoke(member.id, role)} className="rounded-full border border-gold-500/40 px-2 py-0.5 text-xs text-gold-500" title="Revoke role">{role.replaceAll("_", " ")} ×</button>)}{!member.cci_roles.length && <span className="text-xs text-[var(--rv-ink-muted)]">No CCI role assigned</span>}</div></div><div className="flex gap-2"><Link className="rv-btn-ghost text-xs" href={`/academy/${code}/cci/students/${member.id}`}>Record</Link><select aria-label={`Assign role to ${member.name}`} className="rv-input w-auto py-1 text-sm" defaultValue="" onChange={(e) => { if (e.target.value) { assign(member.id, e.target.value); e.currentTarget.value = ""; } }}><option value="" disabled>Assign role…</option>{ROLES.filter((role) => !member.cci_roles.includes(role)).map((role) => <option value={role} key={role}>{role.replaceAll("_", " ")}</option>)}</select></div></div></section>)}{!members.length && !error && <p className="text-sm text-[var(--rv-ink-muted)]">No active Chayil members yet.</p>}</div></main></AppShell>;
}
