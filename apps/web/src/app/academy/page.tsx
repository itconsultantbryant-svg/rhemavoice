"use client";

import { FadeIn, brand } from "@rhemavoice/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChayilLogo } from "@/components/Brand";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Course = {
  id: string;
  title: string;
  summary: string;
  level: string;
  duration_hours: number;
  xp_reward: number;
  category_name: string;
  lessons_count: number;
  my_progress?: { progress: number; xp_earned: number; completed: boolean } | null;
  institution?: { name: string; code: string } | null;
};

export default function AcademyPage() {
  const { api, user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.academy.courses().then((data) => setCourses(data as unknown as Course[])).catch(() => setCourses([]));
  }, [api, user]);

  async function enroll(id: string) {
    setBusyId(id);
    try {
      await api.academy.enroll(id);
      const data = await api.academy.courses();
      setCourses(data as unknown as Course[]);
    } finally {
      setBusyId(null);
    }
  }

  async function advance(id: string, current = 0) {
    setBusyId(id);
    try {
      await api.academy.progress(id, Math.min(100, current + 25));
      const data = await api.academy.courses();
      setCourses(data as unknown as Course[]);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ModuleShell
      moduleId="academy"
      title="Rhema Academy"
      description="Courses, lessons, quizzes, certificates, and live classes — powered by Chayil."
    >
      <FadeIn>
        <div className="rv-card mb-6 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-purple-900 to-purple-700 p-5 text-white">
          <ChayilLogo size="lg" onDark />
          <div className="max-w-md text-sm text-white/85">
            <p className="font-display text-xl text-gold-300">{brand.academyInstitutionFull}</p>
            <p className="mt-1">Flagship institution under Rhema Academy — discipleship, leadership, and Bible studies.</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">Course catalog</h2>
          <Link href="/dashboard" className="text-sm text-[var(--rv-ink-muted)]">
            Home
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <article key={course.id} className="rv-card p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
                {course.institution?.name || brand.academyInstitution} · {course.category_name || "General"}
              </p>
              <h3 className="font-display mt-2 text-xl">{course.title}</h3>
              <p className="mt-2 text-sm text-[var(--rv-ink-muted)]">{course.summary}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--rv-ink-muted)]">
                <span>{course.level}</span>
                <span>{course.duration_hours}h</span>
                <span>{course.lessons_count} lessons</span>
                <span>{course.xp_reward} XP</span>
              </div>
              {course.my_progress && (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs">
                    <span>Progress</span>
                    <span>{course.my_progress.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-purple-900/10 dark:bg-white/10">
                    <div className="h-full rounded-full bg-gold-500" style={{ width: `${course.my_progress.progress}%` }} />
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                {!course.my_progress ? (
                  <button className="rv-btn-primary" disabled={busyId === course.id} onClick={() => enroll(course.id)}>
                    {busyId === course.id ? "Enrolling…" : "Enroll"}
                  </button>
                ) : (
                  <button
                    className="rv-btn-primary"
                    disabled={busyId === course.id || course.my_progress.completed}
                    onClick={() => advance(course.id, course.my_progress?.progress)}
                  >
                    {course.my_progress.completed ? "Completed" : "Continue lesson"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
