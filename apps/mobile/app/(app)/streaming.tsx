import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button, Card, Text, TextInput } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";
import { ModuleShell } from "../../components/ModuleShell";

type StreamItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  church_name: string;
  series: string;
  viewers: number;
  is_featured: boolean;
  chat_preview?: Array<{ id: string; display_name: string; message: string }>;
};

export default function StreamingScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [active, setActive] = useState<StreamItem | null>(null);
  const [chat, setChat] = useState("");
  const [prayer, setPrayer] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.streaming
      .list()
      .then((data: any) => {
        setStreams(data);
        setActive(data.find((s: StreamItem) => s.status === "live") || data[0] || null);
      })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) {
      router.replace("/welcome");
      return;
    }
    load();
  }, [user]);

  async function sendChat() {
    if (!active || !chat.trim()) return;
    await api.streaming.chat(active.id, chat.trim());
    const refreshed = (await api.streaming.get(active.id)) as unknown as StreamItem;
    setActive(refreshed);
    setStreams((prev) => prev.map((s) => (s.id === refreshed.id ? refreshed : s)));
    setChat("");
  }

  async function sendPrayer() {
    if (!active || !prayer.trim()) return;
    await api.streaming.pray(active.id, prayer.trim());
    setPrayer("");
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ModuleShell moduleId="streaming">
      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Animated.View entering={FadeInUp.duration(280)}>
          <Button onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
            Back
          </Button>

          {active && (
            <Card style={{ marginTop: 12, backgroundColor: colors.navy900, borderRadius: 16 }}>
              <Card.Content style={{ paddingVertical: 24, alignItems: "center" }}>
                <View style={{ backgroundColor: active.status === "live" ? "#dc2626" : colors.gold500, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>{active.status}</Text>
                </View>
                <Text variant="headlineSmall" style={{ color: "#fff", fontWeight: "700", marginTop: 12, textAlign: "center" }}>
                  {active.title}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{active.church_name}</Text>
                {active.status === "live" && (
                  <Text style={{ color: colors.gold500, marginTop: 8 }}>{active.viewers} watching</Text>
                )}
              </Card.Content>
            </Card>
          )}

          <Card style={{ marginTop: 16, backgroundColor: colors.elevated }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>Live Chat</Text>
              <View style={{ marginTop: 8, maxHeight: 140 }}>
                {(active?.chat_preview || []).map((m) => (
                  <Text key={m.id} style={{ marginTop: 4, fontSize: 13 }}>
                    <Text style={{ fontWeight: "700", color: colors.gold500 }}>{m.display_name}: </Text>
                    {m.message}
                  </Text>
                ))}
                {!active?.chat_preview?.length && (
                  <Text style={{ color: colors.inkMuted, fontStyle: "italic" }}>Be the first to encourage someone.</Text>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TextInput mode="outlined" placeholder="Type a message…" value={chat} onChangeText={setChat} style={{ flex: 1 }} dense />
                <Button mode="contained" onPress={sendChat} compact style={{ backgroundColor: colors.gold500, justifyContent: "center" }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>
                  Send
                </Button>
              </View>
            </Card.Content>
          </Card>

          <Card style={{ marginTop: 12, backgroundColor: colors.elevated }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>Prayer Request</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <TextInput mode="outlined" placeholder="What should we pray for?" value={prayer} onChangeText={setPrayer} style={{ flex: 1 }} dense />
                <Button mode="outlined" onPress={sendPrayer} compact>
                  Pray
                </Button>
              </View>
            </Card.Content>
          </Card>

          <Text variant="titleLarge" style={{ marginTop: 24, fontWeight: "700" }}>All Streams</Text>
          {streams.map((s) => (
            <Pressable key={s.id} onPress={() => setActive(s)}>
              <Card style={{ marginTop: 8, backgroundColor: colors.elevated, borderWidth: active?.id === s.id ? 1.5 : 0, borderColor: colors.gold500 }}>
                <Card.Content>
                  <Text style={{ fontSize: 10, textTransform: "uppercase", color: colors.gold500, fontWeight: "700" }}>{s.status}</Text>
                  <Text variant="titleMedium" style={{ fontWeight: "700", marginTop: 2 }}>{s.title}</Text>
                  <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{s.church_name}</Text>
                </Card.Content>
              </Card>
            </Pressable>
          ))}
        </Animated.View>
      </ScrollView>
    </ModuleShell>
  );
}
