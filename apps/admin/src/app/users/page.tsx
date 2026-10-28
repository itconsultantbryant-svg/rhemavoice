"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAuth } from "@/lib/auth";

export default function UsersPage() {
  const { api, user } = useAuth();
  const [users, setUsers] = useState<Array<{ id: string; email: string; display_name: string; first_name: string; last_name: string; roles: string[]; is_active: boolean; approval_status?: string }>>([]);

  async function load() {
    setUsers(await api.admin.users() as typeof users);
  }

  useEffect(() => {
    if (!user) return;
    load().catch(() => setUsers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, user]);

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <FadeIn>
          <h1 className="font-display text-3xl">Users</h1>
        <div className="rv-card mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--rv-border)] text-[var(--rv-ink-muted)]">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--rv-border)] last:border-0">
                  <td className="py-3">{u.display_name || `${u.first_name} ${u.last_name}`}</td>
                  <td>{u.email}</td>
                  <td>{u.roles.join(", ")}</td>
                  <td>{u.approval_status === "pending" ? "Pending approval" : u.approval_status === "rejected" ? "Rejected" : u.is_active === false ? "Suspended" : "Active"}</td>
                  <td>
                    {u.approval_status === "pending" ? <div className="flex gap-2"><button
                      className="rv-btn-ghost text-xs"
                      onClick={() => api.admin.updateUser(u.id, { approval_status: "approved" }).then(load)}
                    >
                      Approve
                    </button><button className="rv-btn-ghost text-xs" onClick={() => api.admin.updateUser(u.id, { approval_status: "rejected" }).then(load)}>Reject</button></div> : <button
                      className="rv-btn-ghost text-xs"
                      onClick={() => api.admin.updateUser(u.id, { is_active: !u.is_active }).then(load)}
                    >{u.is_active === false ? "Activate" : "Suspend"}</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </FadeIn>
      </div>
    </AdminShell>
  );
}
