"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

type Report = { generated_at: string; active_members: number; tasks: Record<string, number>; admissions: Record<string, number>; attendance: Record<string, number>; assessments: { submitted: number; graded: number } };
function Metrics({ title, values }: { title: string; values: Record<string, number> }) { return <section className="rv-card p-5"><h2 className="font-display text-xl">{title}</h2><div className="mt-3 grid grid-cols-2 gap-3">{Object.entries(values).map(([key, value]) => <div key={key}><p className="font-display text-xl text-gold-500">{value}</p><p className="text-xs capitalize text-[var(--rv-ink-muted)]">{key.replaceAll("_", " ")}</p></div>)}{!Object.keys(values).length && <p className="text-sm text-[var(--rv-ink-muted)]">No records.</p>}</div></section>; }
export default function CCIReportsPage() {
  const { code } = useParams<{ code: string }>(); const { api } = useAuth(); const [report, setReport] = useState<Report | null>(null); const [error, setError] = useState("");
  useEffect(() => { api.academy.cciReportOverview(code).then((v) => setReport(v as unknown as Report)).catch((e: Error) => setError(e.message)); }, [api, code]);
  return <AppShell><main className="mx-auto max-w-5xl px-4 py-6 md:px-6"><Link href={`/academy/${code}/cci`} className="text-sm text-[var(--rv-ink-muted)]">← CCI Command Center</Link><h1 className="font-display mt-4 text-3xl">CCI reports</h1><p className="mt-1 text-sm text-[var(--rv-ink-muted)]">Aggregate, role-authorized data only. No simulated performance indicators.</p>{error && <p className="mt-6 text-sm text-[var(--rv-danger)]">{error}</p>}{report && <><div className="rv-card mt-6 p-5"><p className="text-sm text-[var(--rv-ink-muted)]">Active CCI members</p><p className="font-display text-3xl text-gold-500">{report.active_members}</p><p className="mt-2 text-xs text-[var(--rv-ink-muted)]">Generated {new Date(report.generated_at).toLocaleString()}</p></div><div className="mt-4 grid gap-4 md:grid-cols-2"><Metrics title="Tasks" values={report.tasks}/><Metrics title="Admissions" values={report.admissions}/><Metrics title="Attendance" values={report.attendance}/><Metrics title="Assessments" values={report.assessments}/></div></>}</main></AppShell>;
}
