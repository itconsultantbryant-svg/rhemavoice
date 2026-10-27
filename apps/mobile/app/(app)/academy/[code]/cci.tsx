import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { api } from "../../../../lib/api";
import { colors } from "../../../../theme";

type Center = {
  roles: string[];
  readiness: { total_tasks: number; open_tasks: number; completed_tasks: number };
  tasks: Array<{ id: string; title: string; status: string; due_at: string | null }>;
  announcements: Array<{ id: string; title: string; body: string }>;
  integration_status: Record<string, string>;
};

export default function CCICommandCenter() {
  const { code = "chayil" } = useLocalSearchParams<{ code: string }>();
  const [center, setCenter] = useState<Center | null>(null); const [error, setError] = useState("");
  const load = async () => { try { setCenter(await api.academy.cciCommandCenter(code) as unknown as Center); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load CCI."); } };
  useEffect(() => { load(); }, [code]);
  return <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
    <Button onPress={() => router.back()}>← Rhema Academy</Button>
    <Text style={{ color: colors.gold500, letterSpacing: 2, fontSize: 11, marginTop: 8 }}>CHAYIL COMPANY INTENSIVE</Text>
    <Text variant="headlineMedium" style={{ color: colors.ink, fontWeight: "700", marginTop: 4 }}>CCI Command Center</Text>
    {error ? <Text style={{ color: "#ef4444", marginTop: 20 }}>{error}</Text> : null}
    {!center && !error ? <Text style={{ color: colors.inkMuted, marginTop: 20 }}>Loading authorized program data…</Text> : null}
    {center && <View style={{ gap: 12, marginTop: 20 }}>
      <View style={{ flexDirection: "row", gap: 10 }}><Metric label="Open tasks" value={center.readiness.open_tasks}/><Metric label="Completed" value={center.readiness.completed_tasks}/></View>
      <Card style={{ backgroundColor: colors.elevated }}><Card.Content><Text variant="titleMedium" style={{ fontWeight: "700", color: colors.ink }}>Official announcements</Text>{center.announcements.map((item) => <View key={item.id} style={{ marginTop: 12 }}><Text style={{ color: colors.ink, fontWeight: "700" }}>{item.title}</Text><Text style={{ color: colors.inkMuted, marginTop: 3 }}>{item.body}</Text></View>)}{!center.announcements.length && <Text style={{ color: colors.inkMuted, marginTop: 8 }}>No published announcements.</Text>}</Card.Content></Card>
      <Card style={{ backgroundColor: colors.elevated }}><Card.Content><Text variant="titleMedium" style={{ fontWeight: "700", color: colors.ink }}>My tasks</Text>{center.tasks.map((task) => <View key={task.id} style={{ marginTop: 10, borderTopWidth: 1, borderColor: "rgba(248,245,252,0.08)", paddingTop: 10 }}><Text style={{ color: colors.ink, fontWeight: "700" }}>{task.title}</Text><Text style={{ color: colors.gold500, fontSize: 12, marginTop: 2 }}>{task.status.replaceAll("_", " ")}</Text></View>)}{!center.tasks.length && <Text style={{ color: colors.inkMuted, marginTop: 8 }}>No assigned tasks.</Text>}</Card.Content></Card>
      <Button mode="outlined" onPress={() => router.push(`/(app)/academy/${code}/grades`)} textColor={colors.gold500}>My grades</Button>
      <Card style={{ backgroundColor: colors.elevated }}><Card.Content><Text variant="titleMedium" style={{ fontWeight: "700", color: colors.ink }}>Integration setup</Text>{Object.entries(center.integration_status).map(([name, status]) => <Text key={name} style={{ color: colors.inkMuted, marginTop: 6 }}>{name.replaceAll("_", " ")}: {status.replaceAll("_", " ")}</Text>)}</Card.Content></Card>
    </View>}
  </ScrollView>;
}

function Metric({ label, value }: { label: string; value: number }) { return <Card style={{ flex: 1, backgroundColor: colors.elevated }}><Card.Content><Text style={{ color: colors.gold500, fontWeight: "700", fontSize: 24 }}>{value}</Text><Text style={{ color: colors.inkMuted, fontSize: 12 }}>{label}</Text></Card.Content></Card>; }
