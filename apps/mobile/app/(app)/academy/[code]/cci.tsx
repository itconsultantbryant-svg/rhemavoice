import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { api } from "../../../../lib/api";

type WorkspaceRole = "management" | "administrator" | "teacher" | "student" | "staff" | "mentor";
type Workspace = {
  institution: { name: string };
  role: WorkspaceRole;
  metrics: { open_tasks: number; completed_tasks: number; members: number; courses: number; pending_submissions: number; mentees: number; audit_events: number };
  announcements: Array<{ id: string; title: string; body: string; audience: string }>;
  links: Array<{ label: string; href: string; description: string }>;
};

const ROLE: Record<WorkspaceRole, { title: string; subtitle: string; color: string; soft: string }> = {
  management: { title: "Management Dashboard", subtitle: "Institution-wide oversight and strategic activity", color: "#0F172A", soft: "#E2E8F0" },
  administrator: { title: "Administrator Dashboard", subtitle: "People, program operations, and CCI administration", color: "#2563EB", soft: "#DBEAFE" },
  teacher: { title: "Teacher Dashboard", subtitle: "Teaching activity, learner work, and grading", color: "#059669", soft: "#D1FAE5" },
  student: { title: "Student Dashboard", subtitle: "Your courses, assignments, formation, and progress", color: "#7C3AED", soft: "#EDE9FE" },
  staff: { title: "Staff Dashboard", subtitle: "Program responsibilities and operational collaboration", color: "#D97706", soft: "#FEF3C7" },
  mentor: { title: "Mentor Dashboard", subtitle: "Mentee progress and formation support", color: "#E11D48", soft: "#FFE4E6" },
};

export default function CCICommandCenter() {
  const { code = "chayil" } = useLocalSearchParams<{ code: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null); const [error, setError] = useState("");
  const load = useCallback(async () => { try { setWorkspace(await api.academy.cciWorkspace(code) as unknown as Workspace); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load CCI."); } }, [code]);
  useEffect(() => { void load(); }, [load]);
  if (error) return <View style={{ flex: 1, backgroundColor: "#F8FAFC", justifyContent: "center", padding: 24 }}><Text style={{ color: "#B91C1C" }}>{error}</Text><Button onPress={() => void load()} style={{ marginTop: 12 }}>Try again</Button></View>;
  if (!workspace) return <View style={{ flex: 1, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center" }}><Text style={{ color: "#64748B" }}>Loading Chayil workspace…</Text></View>;
  const role = ROLE[workspace.role];
  const metrics = [
    ["Open tasks", workspace.metrics.open_tasks], ["Completed", workspace.metrics.completed_tasks],
    [workspace.role === "mentor" ? "Mentees" : "Members", workspace.role === "mentor" ? workspace.metrics.mentees : workspace.metrics.members],
    [workspace.role === "teacher" ? "To grade" : workspace.role === "management" ? "Audit events" : "Courses", workspace.role === "teacher" ? workspace.metrics.pending_submissions : workspace.role === "management" ? workspace.metrics.audit_events : workspace.metrics.courses],
  ].filter(([, value], index) => index < 2 || (workspace.role !== "student" && value !== undefined));
  const navigate = (href: string) => {
    if (href === "../") return router.push(`/(app)/academy/${code}`);
    if (href === "gradebook") return router.push(`/(app)/academy/${code}/grades`);
    // Additional role tools are available in the web command center until
    // their corresponding native forms are added.
    return router.push(`/(app)/academy/${code}`);
  };
  return <ScrollView style={{ flex: 1, backgroundColor: "#F8FAFC" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
    <Button onPress={() => router.push(`/(app)/academy/${code}`)} textColor="#6B21A8">← Rhema Academy</Button>
    <View style={{ marginTop: 12, borderRadius: 18, overflow: "hidden", backgroundColor: role.color, padding: 20 }}>
      <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 11, letterSpacing: 1.5, fontWeight: "700" }}>CHAYIL COMPANY INTENSIVE</Text>
      <Text style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "800", marginTop: 12 }}>{role.title}</Text>
      <Text style={{ color: "rgba(255,255,255,0.86)", lineHeight: 20, marginTop: 6 }}>{role.subtitle}</Text>
    </View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 }}>{metrics.map(([label, value]) => <View key={String(label)} style={{ width: "47%", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#E2E8F0" }}><Text style={{ fontSize: 22, fontWeight: "800", color: "#0F172A" }}>{value}</Text><Text style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{label}</Text></View>)}</View>
    <View style={{ marginTop: 20, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#E2E8F0" }}><Text style={{ fontSize: 17, fontWeight: "800", color: "#0F172A" }}>Your workspace</Text><Text style={{ color: "#64748B", fontSize: 13, marginTop: 3 }}>Role-authorized Chayil tools and records.</Text>{workspace.links.map((link) => <Pressable key={link.label} onPress={() => navigate(link.href)} style={{ marginTop: 12, padding: 13, borderRadius: 10, backgroundColor: role.soft }}><Text style={{ color: "#1E293B", fontWeight: "700" }}>{link.label}  →</Text><Text style={{ color: "#475569", fontSize: 12, marginTop: 3 }}>{link.description}</Text></Pressable>)}</View>
    <View style={{ marginTop: 16, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#E2E8F0" }}><Text style={{ fontSize: 17, fontWeight: "800", color: "#0F172A" }}>Official updates</Text>{workspace.announcements.map((item) => <View key={item.id} style={{ marginTop: 13, borderTopWidth: 1, borderColor: "#F1F5F9", paddingTop: 13 }}><Text style={{ color: "#1E293B", fontWeight: "700" }}>{item.title}</Text><Text style={{ color: "#64748B", fontSize: 13, marginTop: 3 }}>{item.body}</Text></View>)}{!workspace.announcements.length && <Text style={{ color: "#64748B", marginTop: 10 }}>No official updates have been published.</Text>}</View>
  </ScrollView>;
}
