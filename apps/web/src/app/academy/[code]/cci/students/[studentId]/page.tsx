"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChayilWorkspace } from "@/components/ChayilWorkspace";
import { useAuth } from "@/lib/auth";

type RecordData = { student: { name: string; email: string }; formation_notes: Array<{ id: string; summary: string; visibility: string; created_at: string }>; attendance: Array<{ id: string; status: string; note: string; recorded_at: string }> };
export default function CCIStudentRecordPage() {
  const { code, studentId } = useParams<{ code: string; studentId: string }>(); const { api } = useAuth(); const [data, setData] = useState<RecordData | null>(null); const [error, setError] = useState("");
  useEffect(() => { api.academy.cciStudentRecords(code, studentId).then((v) => setData(v as unknown as RecordData)).catch((e: Error) => setError(e.message)); }, [api, code, studentId]);
  return <ChayilWorkspace backHref={`/academy/${code}/cci`}><main className="mx-auto max-w-4xl px-4 py-6 md:px-6"><Link href={`/academy/${code}/cci/members`} className="text-sm text-[var(--rv-ink-muted)]">← CCI members</Link>{error && <p className="mt-6 text-sm text-[var(--rv-danger)]">{error}</p>}{data && <><h1 className="font-display mt-4 text-3xl">{data.student.name}</h1><p className="text-sm text-[var(--rv-ink-muted)]">{data.student.email}</p><section className="rv-card mt-6 p-5"><h2 className="font-display text-xl">Formation notes</h2><div className="mt-3 space-y-3">{data.formation_notes.map((note) => <article key={note.id} className="border-b border-[var(--rv-border)] pb-3 last:border-0"><p className="text-sm">{note.summary}</p><p className="mt-1 text-xs text-[var(--rv-ink-muted)]">{note.visibility} · {new Date(note.created_at).toLocaleDateString()}</p></article>)}{!data.formation_notes.length && <p className="text-sm text-[var(--rv-ink-muted)]">No formation notes.</p>}</div></section><section className="rv-card mt-4 p-5"><h2 className="font-display text-xl">Attendance</h2><div className="mt-3 space-y-2">{data.attendance.map((entry) => <div key={entry.id} className="flex justify-between border-b border-[var(--rv-border)] py-2 last:border-0"><span className="capitalize">{entry.status}</span><span className="text-xs text-[var(--rv-ink-muted)]">{new Date(entry.recorded_at).toLocaleDateString()}</span></div>)}{!data.attendance.length && <p className="text-sm text-[var(--rv-ink-muted)]">No attendance recorded.</p>}</div></section></>}</main></ChayilWorkspace>;
}
