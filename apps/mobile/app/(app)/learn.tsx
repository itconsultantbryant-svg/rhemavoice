import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, Chip, Text } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";
import { ModuleShell } from "../../components/ModuleShell";

type Area = { id: string; name: string; slug: string };
type Lesson = { id: string; title: string; teacher_name: string; area_name: string; is_voice: boolean };
type Session = { id: string; title: string; host_name: string; status: string; participant_count: number };

export default function LearnScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [areas, setAreas] = useState<Area[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    Promise.all([api.learn.areas(), api.learn.lessons(), api.learn.sessions()])
      .then(([a, l, s]: any) => {
        setAreas(a);
        setLessons(l);
        setSessions(s);
      })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.replace("/welcome"); return; }
    load();
  }, [user]);

  const filteredLessons = selectedArea
    ? lessons.filter((l) => l.area_name === selectedArea)
    : lessons;

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ModuleShell moduleId="learn">
      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Animated.View entering={FadeInUp.duration(280)}>
          <Button onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>Back</Button>

          {sessions.filter((s) => s.status === "live").length > 0 && (
            <>
              <Text variant="titleLarge" style={{ marginTop: 12, fontWeight: "700" }}>Live Sessions</Text>
              {sessions.filter((s) => s.status === "live").map((s) => (
                <Card key={s.id} style={{ marginTop: 8, backgroundColor: colors.elevated }}>
                  <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Avatar.Icon size={36} icon="broadcast" color="#dc2626" style={{ backgroundColor: "rgba(220,38,38,0.1)" }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700" }}>{s.title}</Text>
                      <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{s.host_name} · {s.participant_count} participants</Text>
                    </View>
                    <View style={{ backgroundColor: "#dc2626", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>LIVE</Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}

          <Text variant="titleLarge" style={{ marginTop: 20, fontWeight: "700" }}>Lessons</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <Chip
              selected={!selectedArea}
              onPress={() => setSelectedArea(null)}
              style={{ marginRight: 6 }}
            >
              All
            </Chip>
            {areas.map((a) => (
              <Chip
                key={a.id}
                selected={selectedArea === a.name}
                onPress={() => setSelectedArea(a.name)}
                style={{ marginRight: 6 }}
              >
                {a.name}
              </Chip>
            ))}
          </ScrollView>

          {filteredLessons.map((l) => (
            <Card key={l.id} style={{ marginTop: 10, backgroundColor: colors.elevated }}>
              <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar.Icon size={36} icon={l.is_voice ? "microphone" : "book-open-page-variant"} color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700" }}>{l.title}</Text>
                  <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{l.teacher_name} · {l.area_name}</Text>
                </View>
                {l.is_voice && <Chip compact>Voice</Chip>}
              </Card.Content>
            </Card>
          ))}

          {sessions.filter((s) => s.status !== "live").length > 0 && (
            <>
              <Text variant="titleMedium" style={{ marginTop: 20, fontWeight: "700" }}>Upcoming Sessions</Text>
              {sessions.filter((s) => s.status !== "live").map((s) => (
                <Card key={s.id} style={{ marginTop: 8, backgroundColor: colors.elevated }}>
                  <Card.Content>
                    <Text style={{ fontWeight: "600" }}>{s.title}</Text>
                    <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{s.host_name} · {s.status}</Text>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </ModuleShell>
  );
}
