"use client";

import { CCICommandCenterPage } from "@/components/CCICommandCenter";

export default function RoleWorkspacePage({ params }: { params: { role: string } }) {
  return <CCICommandCenterPage expectedRole={params.role as "administrator" | "teacher" | "student" | "advisor"} />;
}
