"use client";

import { useParams } from "next/navigation";
import { KeyRound, Search, UserPlus, UsersRound, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ChayilWorkspace } from "@/components/ChayilWorkspace";
import { useAuth } from "@/lib/auth";

type Member = { id: string; name: string; email: string; membership_role: string; cci_roles: string[]; cci_username: string | null };
const ROLES = ["administrator", "teacher", "advisor", "student"];
const EMPTY_MEMBER = { email: "", membership_role: "student", cci_role: "student", cci_username: "", cci_password: "" };

export default function CCIMembersPage() {
  const { code } = useParams<{ code: string }>();
  const { api } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newMember, setNewMember] = useState(EMPTY_MEMBER);
  const [credentialMember, setCredentialMember] = useState<Member | null>(null);
  const [credentialForm, setCredentialForm] = useState({ cci_username: "", cci_password: "" });

  const load = useCallback(async () => {
    try { setMembers(await api.academy.cciMembers(code) as Member[]); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load CCI people."); }
  }, [api, code]);
  useEffect(() => { void load(); }, [load]);
  const rows = useMemo(() => members.filter((member) => (`${member.name} ${member.email}`.toLowerCase().includes(query.toLowerCase())) && (roleFilter === "all" || member.cci_roles.includes(roleFilter))), [members, query, roleFilter]);

  async function addMember(event: FormEvent) {
    event.preventDefault();
    try { await api.academy.createCciMember(code, newMember); setNewMember(EMPTY_MEMBER); setInviteOpen(false); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add this user."); }
  }
  async function assign(id: string, role: string) { try { await api.academy.assignCciRole(code, id, role); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to assign role."); } }
  async function revoke(id: string, role: string) { try { await api.academy.revokeCciRole(code, id, role); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove role."); } }
  function openCredentialEditor(member: Member) { setCredentialMember(member); setCredentialForm({ cci_username: member.cci_username || "", cci_password: "" }); }
  async function saveCredentials(event: FormEvent) {
    event.preventDefault();
    if (!credentialMember) return;
    try { await api.academy.updateCciMemberCredentials(code, credentialMember.id, credentialForm); setCredentialMember(null); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update CCI credentials."); }
  }

  return <ChayilWorkspace><div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#2563EB]">Administration</p><h1 className="mt-1 text-3xl font-bold text-[#202334]">People & access</h1><p className="mt-2 text-sm text-[#667085]">Issue, reset, and manage separate CCI credentials for approved RhemaVoice users.</p></div><button onClick={() => setInviteOpen(true)} className="rv-btn-primary text-sm"><UserPlus className="mr-2 h-4 w-4" />Add verified user</button></div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]">{error}</div>}
    <section className="rv-card p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#2563EB]"><UsersRound className="h-5 w-5" /></span><div><p className="text-2xl font-bold text-[#202334]">{members.length}</p><p className="text-sm text-[#667085]">Active CCI participants</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input aria-label="Search people" className="rv-input pl-9 sm:w-64" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" /></label><select aria-label="Filter by role" className="rv-input sm:w-40" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">All roles</option>{ROLES.map((role) => <option key={role}>{role}</option>)}</select></div></div></section>
    <section className="rv-card overflow-hidden"><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-[#F7F7FB] text-xs uppercase tracking-wide text-[#667085]"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">CCI username</th><th className="px-5 py-3">CCI roles</th><th className="px-5 py-3">Access</th></tr></thead><tbody>{rows.map((member) => <tr className="border-t border-[#E5E7EB]" key={member.id}><td className="px-5 py-4"><p className="font-semibold text-[#202334]">{member.name}</p><p className="text-xs text-[#667085]">{member.email}</p></td><td className="px-5 py-4 text-[#667085]">{member.cci_username || "Not issued"}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{member.cci_roles.map((role) => <button title={`Remove ${role}`} onClick={() => void revoke(member.id, role)} className="rounded-full bg-[#F3EEFF] px-2.5 py-1 text-xs font-semibold capitalize text-[#6D28D9]" key={role}>{role} ×</button>)}{!member.cci_roles.length && <span className="text-xs text-[#667085]">No CCI role</span>}</div></td><td className="px-5 py-4"><div className="flex items-center gap-2"><button onClick={() => openCredentialEditor(member)} className="rv-btn-ghost px-3 py-2 text-xs"><KeyRound className="mr-1.5 h-3.5 w-3.5" />Reset password</button><select aria-label={`Assign CCI role to ${member.name}`} className="rv-input w-32 py-2 text-xs" defaultValue="" onChange={(event) => { if (event.target.value) void assign(member.id, event.target.value); event.currentTarget.value = ""; }}><option value="" disabled>Assign role</option>{ROLES.filter((role) => !member.cci_roles.includes(role)).map((role) => <option key={role} value={role}>{role}</option>)}</select></div></td></tr>)}</tbody></table></div>{!rows.length && <p className="p-7 text-center text-sm text-[#667085]">No people match these filters.</p>}</section>
    {inviteOpen && <MemberModal title="Add verified RhemaVoice user" onClose={() => setInviteOpen(false)} onSubmit={addMember}><p className="text-sm text-[#667085]">The user must already have created and verified their RhemaVoice account.</p><CredentialFields form={newMember} onChange={setNewMember} includeEmail /><select aria-label="Academy role" className="rv-input" value={newMember.membership_role} onChange={(event) => setNewMember({ ...newMember, membership_role: event.target.value })}>{["student", "mentor", "instructor", "staff", "academy_admin"].map((role) => <option key={role}>{role.replaceAll("_", " ")}</option>)}</select><select aria-label="CCI role" className="rv-input" value={newMember.cci_role} onChange={(event) => setNewMember({ ...newMember, cci_role: event.target.value })}>{ROLES.map((role) => <option key={role}>{role}</option>)}</select><button className="rv-btn-primary">Add to CCI</button></MemberModal>}
    {credentialMember && <MemberModal title={`Manage ${credentialMember.name}'s CCI access`} onClose={() => setCredentialMember(null)} onSubmit={saveCredentials}><p className="text-sm text-[#667085]">Change the CCI username or enter a new password to reset it. This does not change the RhemaVoice password.</p><CredentialFields form={credentialForm} onChange={setCredentialForm} /><button className="rv-btn-primary">Save CCI credentials</button></MemberModal>}
  </div></ChayilWorkspace>;
}

function CredentialFields({ form, onChange, includeEmail = false }: { form: { cci_username: string; cci_password: string; email?: string }; onChange: (value: any) => void; includeEmail?: boolean }) {
  return <>{includeEmail && <input className="rv-input" required type="email" aria-label="RhemaVoice email" placeholder="RhemaVoice email" value={form.email || ""} onChange={(event) => onChange({ ...form, email: event.target.value })} />}<input className="rv-input" required autoComplete="off" aria-label="CCI username" placeholder="CCI username" value={form.cci_username} onChange={(event) => onChange({ ...form, cci_username: event.target.value.toLowerCase() })} /><input className="rv-input" required={includeEmail} minLength={12} type="password" autoComplete="new-password" aria-label="New CCI password" placeholder={includeEmail ? "Temporary CCI password (12+ characters)" : "New password (leave blank to keep current)"} value={form.cci_password} onChange={(event) => onChange({ ...form, cci_password: event.target.value })} /></>;
}

function MemberModal({ title, children, onClose, onSubmit }: { title: string; children: React.ReactNode; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"><form onSubmit={onSubmit} className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-4"><h2 className="text-xl font-bold text-[#202334]">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2" aria-label="Close"><X className="h-5 w-5" /></button></div>{children}<div className="flex justify-end gap-3 pt-3"><button type="button" onClick={onClose} className="rv-btn-ghost">Cancel</button></div></form></div>;
}
