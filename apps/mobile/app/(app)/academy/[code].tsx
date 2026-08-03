import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button, ProgressBar, Text } from "react-native-paper";
import { api } from "../../../lib/api";
import { useAppSelector } from "../../../store";
import { colors } from "../../../theme";

type Dash = {
  institution: { name: string; tagline: string; code: string };
  membership: { current_week: number; overall_progress: number; attendance_pct: number; program_weeks: number; role: string };
  student_name: string;
  mentor: { name: string; rating: number } | null;
  stats: { attendance_pct: number; assignments_done: number; assignments_total: number };
  live_classes: Array<{ id: string; title: string; instructor_name: string; status: string; viewer_count: number }>;
  assignments: Array<{ id: string; title: string; instructions: string; my_submission: unknown }>;
  curriculum: Array<{ week: number; sessions: Array<{ id: string; title: string; status: string }> }>;
  events: Array<{ id: string; title: string; event_type: string }>;
  resources: Array<{ id: string; title: string; resource_type: string }>;
};

const TABS = ["Dashboard", "Courses", "Live", "Assignments", "Mentor", "Progress"] as const;

export default function AcademyDashboard() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const user = useAppSelector((s) => s.auth.user);
  const [dash, setDash] = useState<Dash | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Dashboard");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !code) return;
    api.academy
      .dashboard(String(code))
      .then((d) => setDash(d as unknown as Dash))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [user, code]);

  if (error) {
    return (
      <View style={{ flex: 1, padding: 20, backgroundColor: colors.surface }}>
        <Button onPress={() => router.back()}>Back</Button>
        <Text style={{ marginTop: 16, color: colors.danger }}>{error}</Text>
      </View>
    );
  }

  if (!dash) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading academy…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => router.push("/(app)/academy")}>← Academies</Button>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
          {dash.institution.code === "chayil" && (
            <Image source={require("../../../assets/brand/chayil_logo.jpeg")} style={{ width: 48, height: 48, borderRadius: 12 }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", fontSize: 20, color: colors.navy900 }}>{dash.institution.name}</Text>
            <Text style={{ color: colors.gold500, fontSize: 12 }}>Powered by RhemaVoice</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
          {TABS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={{
                marginRight: 8,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: tab === t ? "rgba(223,166,34,0.15)" : colors.elevated,
                borderWidth: 1,
                borderColor: tab === t ? colors.gold500 : "rgba(16,0,48,0.08)",
              }}
            >
              <Text style={{ color: tab === t ? colors.gold500 : colors.navy900, fontSize: 13 }}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === "Dashboard" && (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: colors.inkMuted }}>Welcome back,</Text>
            <Text style={{ fontWeight: "700", fontSize: 22, color: colors.navy900 }}>{dash.student_name}</Text>
            <Text style={{ marginTop: 8, color: colors.gold500 }}>
              {dash.membership.overall_progress}% · Week {dash.membership.current_week} of {dash.membership.program_weeks}
            </Text>
            <ProgressBar
              progress={dash.membership.overall_progress / 100}
              color={colors.gold500}
              style={{ marginTop: 8 }}
            />

            {dash.live_classes
              .filter((c) => c.status === "live")
              .map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setTab("Live")}
                  style={{ marginTop: 16, backgroundColor: colors.navy900, borderRadius: 14, padding: 16 }}
                >
                  <Text style={{ color: colors.gold500, fontSize: 11, fontWeight: "700" }}>LIVE</Text>
                  <Text style={{ color: "#fff", fontWeight: "700", marginTop: 6 }}>{c.title}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{c.instructor_name}</Text>
                  <Text style={{ color: colors.gold300, marginTop: 10 }}>Join Live Class →</Text>
                </Pressable>
              ))}

            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <View style={{ flex: 1, backgroundColor: colors.elevated, borderRadius: 12, padding: 12, alignItems: "center" }}>
                <Text style={{ fontWeight: "700", color: colors.gold500 }}>{dash.stats.attendance_pct}%</Text>
                <Text style={{ fontSize: 11, color: colors.inkMuted }}>Attendance</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.elevated, borderRadius: 12, padding: 12, alignItems: "center" }}>
                <Text style={{ fontWeight: "700", color: colors.gold500 }}>
                  {dash.stats.assignments_done}/{dash.stats.assignments_total}
                </Text>
                <Text style={{ fontSize: 11, color: colors.inkMuted }}>Assignments</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.elevated, borderRadius: 12, padding: 12, alignItems: "center" }}>
                <Text style={{ fontWeight: "700", fontSize: 12 }} numberOfLines={1}>
                  {dash.mentor?.name || "—"}
                </Text>
                <Text style={{ fontSize: 11, color: colors.inkMuted }}>Mentor</Text>
              </View>
            </View>
          </View>
        )}

        {tab === "Courses" && (
          <View style={{ marginTop: 16 }}>
            {dash.curriculum.map((w) => (
              <View key={w.week} style={{ marginBottom: 16, backgroundColor: colors.elevated, borderRadius: 14, padding: 14 }}>
                <Text style={{ fontWeight: "700" }}>Week {w.week}</Text>
                {w.sessions.map((s) => (
                  <View key={s.id} style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
                    <Text>{s.title}</Text>
                    <Text style={{ color: colors.gold500, fontSize: 12, textTransform: "capitalize" }}>
                      {s.status.replace("_", " ")}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {tab === "Live" && (
          <View style={{ marginTop: 16 }}>
            {dash.live_classes.map((c) => (
              <View key={c.id} style={{ marginBottom: 12, backgroundColor: colors.navy900, borderRadius: 14, padding: 20 }}>
                <Text style={{ color: colors.gold500, fontWeight: "700" }}>{c.status.toUpperCase()}</Text>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 8 }}>{c.title}</Text>
                <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{c.instructor_name}</Text>
                <Text style={{ color: colors.gold300, marginTop: 8 }}>{c.viewer_count} watching</Text>
              </View>
            ))}
          </View>
        )}

        {tab === "Assignments" && (
          <View style={{ marginTop: 16 }}>
            {dash.assignments.map((a) => (
              <View key={a.id} style={{ marginBottom: 12, backgroundColor: colors.elevated, borderRadius: 14, padding: 14 }}>
                <Text style={{ fontWeight: "700" }}>{a.title}</Text>
                <Text style={{ color: colors.inkMuted, marginTop: 6, fontSize: 13 }}>{a.instructions}</Text>
                <Button
                  mode="contained"
                  style={{ marginTop: 12, backgroundColor: colors.navy900 }}
                  disabled={!!a.my_submission}
                  onPress={() =>
                    api.academy.submitAssignment(a.id, { file_name: "submission.pdf" }).then(() =>
                      api.academy.dashboard(String(code)).then((d) => setDash(d as unknown as Dash))
                    )
                  }
                >
                  {a.my_submission ? "Submitted" : "Submit Assignment"}
                </Button>
              </View>
            ))}
          </View>
        )}

        {tab === "Mentor" && (
          <View style={{ marginTop: 16, backgroundColor: colors.elevated, borderRadius: 14, padding: 16 }}>
            <Text style={{ fontWeight: "700", fontSize: 18 }}>My Mentor</Text>
            <Text style={{ marginTop: 8, fontSize: 16 }}>{dash.mentor?.name || "Not assigned"}</Text>
            {dash.mentor && <Text style={{ color: colors.gold500, marginTop: 4 }}>★ {dash.mentor.rating}</Text>}
            <Button mode="outlined" style={{ marginTop: 12 }}>
              Message Mentor
            </Button>
          </View>
        )}

        {tab === "Progress" && (
          <View style={{ marginTop: 16, backgroundColor: colors.elevated, borderRadius: 14, padding: 16 }}>
            <Text style={{ fontWeight: "700", fontSize: 18 }}>My Progress</Text>
            <Text style={{ marginTop: 12, color: colors.gold500, fontSize: 32, fontWeight: "700" }}>
              {dash.membership.overall_progress}%
            </Text>
            <Text style={{ marginTop: 8 }}>Attendance {dash.membership.attendance_pct}%</Text>
            <Text style={{ marginTop: 4 }}>
              Assignments {dash.stats.assignments_done}/{dash.stats.assignments_total}
            </Text>
            <Text style={{ marginTop: 12, color: colors.inkMuted }}>Certificate: On track for graduation</Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}
