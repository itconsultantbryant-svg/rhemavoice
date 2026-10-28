"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChayilWorkspace } from "@/components/ChayilWorkspace";
import { useAuth } from "@/lib/auth";

type Grade = { submission_id: string; assignment_title: string; max_marks: number; score: number | null; status: string; submitted_at: string | null };
export default function CCIGradebookPage() {
  const { code } = useParams<{ code: string }>(); const { api } = useAuth(); const [grades, setGrades] = useState<Grade[]>([]); const [canGrade, setCanGrade] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async () => { try { const center = await api.academy.cciCommandCenter(code) as { roles?: string[] }; const allowed = ["founder", "program_director", "curriculum_director", "instructor"].some((role) => center.roles?.includes(role)); setCanGrade(allowed); setGrades((allowed ? await api.academy.cciGradebook(code) : await api.academy.myCciGrades(code)) as unknown as Grade[]); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load grades."); } }, [api, code]);
  useEffect(() => { void load(); }, [load]);
  async function grade(id: string, max: number) { const raw = window.prompt(`Score (0–${max})`); if (raw === null) return; const score = Number(raw); if (!Number.isInteger(score)) return; await api.academy.gradeCciSubmission(code, id, score); await load(); }
  return <ChayilWorkspace backHref={`/academy/${code}/cci`}><main className="mx-auto max-w-4xl px-4 py-6 md:px-6"><Link href={`/academy/${code}/cci`} className="text-sm text-[var(--rv-ink-muted)]">← CCI Command Center</Link><h1 className="font-display mt-4 text-3xl">{canGrade ? "CCI gradebook" : "My grades"}</h1><p className="mt-1 text-sm text-[var(--rv-ink-muted)]">Scores reflect stored assessment records. Grading rules remain institution-configured.</p>{error && <p className="mt-6 text-sm text-[var(--rv-danger)]">{error}</p>}<div className="mt-6 space-y-2">{grades.map((gradeRow) => <section className="rv-card flex flex-wrap items-center justify-between gap-3 p-4" key={gradeRow.submission_id}><div><p className="font-medium">{gradeRow.assignment_title}</p><p className="text-xs text-[var(--rv-ink-muted)]">{gradeRow.status} · Maximum {gradeRow.max_marks}</p></div><div className="flex items-center gap-3"><span className="font-display text-lg text-gold-500">{gradeRow.score ?? "—"}</span>{canGrade && <button className="rv-btn-ghost text-xs" onClick={() => grade(gradeRow.submission_id, gradeRow.max_marks)}>Grade</button>}</div></section>)}{!grades.length && !error && <p className="text-sm text-[var(--rv-ink-muted)]">No graded or submitted work is available.</p>}</div></main></ChayilWorkspace>;
}
