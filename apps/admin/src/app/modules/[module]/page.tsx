"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAuth } from "@/lib/auth";

export default function ModuleAdminPage({ params }: { params: { module: string } }) {
  const moduleId = params.module;
  const title = moduleId.replace(/-/g, " ");
  const { api } = useAuth();
  const [jobs, setJobs] = useState<Array<Record<string, unknown>>>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [apps, setApps] = useState<Array<Record<string, unknown>>>([]);
  const [chats, setChats] = useState<Array<Record<string, unknown>>>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    if (moduleId === "jobs" || moduleId === "opportunities") {
      setJobs(await api.admin.jobs());
      setApps(await api.admin.applications());
    } else if (moduleId === "marketplace" || moduleId === "store") {
      setOrders(await api.admin.orders());
    } else if (moduleId === "chat") {
      setChats(await api.admin.chat());
    }
  }

  useEffect(() => {
    load().catch(() => setMessage("Unable to load admin data."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, api]);

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">
        <FadeIn>
          <h1 className="font-display text-3xl capitalize">{title} Admin</h1>
        {message && <p className="mt-2 text-sm text-gold-500">{message}</p>}

        {moduleId === "opportunities" || moduleId === "jobs" ? (
          <div className="mt-6 space-y-6">
            <section className="rv-card p-5">
              <h2 className="font-display text-xl">Job postings</h2>
              <div className="mt-3 space-y-2">
                {jobs.map((j) => (
                  <div key={String(j.id)} className="flex items-center justify-between gap-3 border-b border-[var(--rv-border)] py-2">
                    <div>
                      <p className="font-medium">{String(j.title)}</p>
                      <p className="text-xs text-[var(--rv-ink-muted)]">
                        {String(j.company_name)} · {j.is_approved ? "Approved" : "Pending"} · {String(j.applications)} apps
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rv-btn-ghost text-xs"
                        onClick={() => api.admin.jobAction(String(j.id), "approve").then(load)}
                      >
                        Approve
                      </button>
                      <button
                        className="rv-btn-ghost text-xs"
                        onClick={() => api.admin.jobAction(String(j.id), "reject").then(load)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rv-card p-5">
              <h2 className="font-display text-xl">Applications</h2>
              <div className="mt-3 space-y-2">
                {apps.map((a) => (
                  <div key={String(a.id)} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium">{String(a.job_title)}</p>
                      <p className="text-xs text-[var(--rv-ink-muted)]">
                        {String(a.applicant)} · {String(a.status)}
                      </p>
                    </div>
                    <select
                      className="rv-input w-auto"
                      value={String(a.status)}
                      onChange={(e) => api.admin.updateApplication(String(a.id), e.target.value).then(load)}
                    >
                      {["submitted", "reviewing", "interview", "offered", "rejected"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
            <section className="rv-card p-5">
              <h2 className="font-display text-xl">Opportunities module</h2>
              <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">
                Jobs, scholarships, grants, and loans are served from `/api/v1/opportunities/`. Partner approval
                workflows expand here as listings grow beyond the legacy Jobs admin tools above.
              </p>
            </section>
          </div>
        ) : null}

        {(moduleId === "marketplace" || moduleId === "store") && (
          <section className="rv-card mt-6 p-5">
            <h2 className="font-display text-xl">Orders</h2>
            <div className="mt-3 space-y-2">
              {orders.map((o) => (
                <div key={String(o.id)} className="flex items-center justify-between gap-3 border-b border-[var(--rv-border)] py-2">
                  <div>
                    <p className="font-medium">{String(o.reference)}</p>
                    <p className="text-xs text-[var(--rv-ink-muted)]">
                      {String(o.user)} · ${(Number(o.total_cents) / 100).toFixed(2)} · {String(o.status)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rv-btn-ghost text-xs" onClick={() => api.admin.orderAction(String(o.id), "fulfill").then(load)}>
                      Fulfill
                    </button>
                    <button className="rv-btn-ghost text-xs" onClick={() => api.admin.orderAction(String(o.id), "cancel").then(load)}>
                      Cancel
                    </button>
                    <button className="rv-btn-ghost text-xs" onClick={() => api.admin.orderAction(String(o.id), "refund").then(load)}>
                      Refund
                    </button>
                  </div>
                </div>
              ))}
              {!orders.length && <p className="text-sm text-[var(--rv-ink-muted)]">No orders yet.</p>}
            </div>
          </section>
        )}

        {moduleId === "chat" && (
          <section className="rv-card mt-6 p-5">
            <h2 className="font-display text-xl">Conversations</h2>
            <div className="mt-3 space-y-2">
              {chats.map((c) => (
                <div key={String(c.id)} className="border-b border-[var(--rv-border)] py-2">
                  <p className="font-medium">{String(c.title) || "Untitled"}</p>
                  <p className="text-xs text-[var(--rv-ink-muted)]">
                    {(c.participants as string[])?.join(", ")} · {String(c.message_count)} messages
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!["jobs", "opportunities", "marketplace", "store", "chat"].includes(moduleId) && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rv-card p-5">
              <h2 className="font-display text-xl">Partner management</h2>
              <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">
                Approve partners, review content, and monitor activity for this module. Deeper admin tools roll out
                per tenant type (church, academy, radio, transport, ticketing, travel).
              </p>
            </div>
            <div className="rv-card p-5">
              <h2 className="font-display text-xl">Reports</h2>
              <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">
                Platform analytics and audit logs are available from the main admin navigation.
              </p>
            </div>
          </div>
        )}
      </FadeIn>
      </div>
    </AdminShell>
  );
}
