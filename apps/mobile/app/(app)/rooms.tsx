import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, Chip, IconButton, Text, TextInput } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";
import { ModuleShell } from "../../components/ModuleShell";

type Participant = { display_name: string; role: string; hand_raised: boolean };
type Poll = { question: string; options: string[] };
type Room = {
  id: string;
  title: string;
  description: string;
  visibility: string;
  topic: string;
  is_live: boolean;
  participant_count: number;
  host_name: string;
  my_participation?: { role: string; is_muted: boolean; hand_raised: boolean } | null;
  active_poll?: Poll | null;
  participants_preview?: Participant[];
  chat_messages?: Array<{ id: string; display_name: string; message: string }>;
};

export default function RoomsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [active, setActive] = useState<Room | null>(null);
  const [chatMsg, setChatMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.rooms
      .list()
      .then((data: any) => {
        setRooms(data);
        setActive(data.find((r: Room) => r.is_live) || data[0] || null);
      })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.replace("/welcome"); return; }
    load();
  }, [user]);

  async function selectRoom(room: Room) {
    const msgs = (await api.rooms.messages(room.id)) as any;
    setActive({ ...room, chat_messages: msgs });
  }

  async function joinRoom() {
    if (!active) return;
    await api.rooms.join(active.id);
    setActive((a) => a && { ...a, my_participation: { role: "listener", is_muted: true, hand_raised: false } });
  }

  async function leaveRoom() {
    if (!active) return;
    await api.rooms.leave(active.id);
    setActive((a) => a && { ...a, my_participation: null });
  }

  async function raiseHand() {
    if (!active) return;
    await api.rooms.raiseHand(active.id);
    setActive((a) => a && a.my_participation ? { ...a, my_participation: { ...a.my_participation, hand_raised: !a.my_participation.hand_raised } } : a);
  }

  async function toggleMute() {
    if (!active) return;
    await api.rooms.mute(active.id);
    setActive((a) => a && a.my_participation ? { ...a, my_participation: { ...a.my_participation, is_muted: !a.my_participation.is_muted } } : a);
  }

  async function sendChat() {
    if (!active || !chatMsg.trim()) return;
    await api.rooms.chat(active.id, chatMsg.trim());
    const msgs = (await api.rooms.messages(active.id)) as any;
    setActive((a) => a && { ...a, chat_messages: msgs });
    setChatMsg("");
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ModuleShell moduleId="rooms">
      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Animated.View entering={FadeInUp.duration(280)}>
          <Button onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>Back</Button>

          {active && (
            <Card style={{ marginTop: 12, backgroundColor: colors.elevated }}>
              <Card.Content>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text variant="titleLarge" style={{ fontWeight: "700", flex: 1 }}>{active.title}</Text>
                  {active.is_live && (
                    <View style={{ backgroundColor: "#dc2626", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>LIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: colors.inkMuted, marginTop: 4 }}>{active.topic || active.description}</Text>
                <Text style={{ color: colors.gold500, fontSize: 12, marginTop: 4 }}>
                  Host: {active.host_name} · {active.participant_count} participants
                </Text>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  {!active.my_participation ? (
                    <Button mode="contained" onPress={joinRoom} compact style={{ backgroundColor: colors.navy900 }}>Join</Button>
                  ) : (
                    <>
                      <Button mode="outlined" onPress={leaveRoom} compact>Leave</Button>
                      <IconButton icon="hand-wave" onPress={raiseHand} iconColor={active.my_participation.hand_raised ? colors.gold500 : colors.inkMuted} size={20} />
                      <IconButton icon={active.my_participation.is_muted ? "microphone-off" : "microphone"} onPress={toggleMute} size={20} />
                    </>
                  )}
                </View>

                {active.participants_preview && active.participants_preview.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {active.participants_preview.map((p, i) => (
                      <Chip key={i} compact>{p.display_name}{p.hand_raised ? " ✋" : ""}</Chip>
                    ))}
                  </View>
                )}

                {active.active_poll && (
                  <View style={{ marginTop: 12, padding: 12, backgroundColor: "rgba(197,160,72,0.08)", borderRadius: 10 }}>
                    <Text style={{ fontWeight: "700" }}>Poll: {active.active_poll.question}</Text>
                    {active.active_poll.options.map((opt, i) => (
                      <Text key={i} style={{ marginTop: 4, color: colors.inkMuted }}>• {opt}</Text>
                    ))}
                  </View>
                )}
              </Card.Content>
            </Card>
          )}

          {active && (
            <Card style={{ marginTop: 12, backgroundColor: colors.elevated }}>
              <Card.Content>
                <Text variant="titleMedium" style={{ fontWeight: "700" }}>Room Chat</Text>
                <View style={{ marginTop: 8, maxHeight: 120 }}>
                  {(active.chat_messages || []).map((m) => (
                    <Text key={m.id} style={{ marginTop: 3, fontSize: 13 }}>
                      <Text style={{ fontWeight: "700", color: colors.gold500 }}>{m.display_name}: </Text>{m.message}
                    </Text>
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <TextInput mode="outlined" placeholder="Message…" value={chatMsg} onChangeText={setChatMsg} style={{ flex: 1 }} dense />
                  <Button mode="contained" onPress={sendChat} compact style={{ backgroundColor: colors.navy900, justifyContent: "center" }}>Send</Button>
                </View>
              </Card.Content>
            </Card>
          )}

          <Text variant="titleLarge" style={{ marginTop: 24, fontWeight: "700" }}>All Rooms</Text>
          {rooms.map((r) => (
            <Pressable key={r.id} onPress={() => selectRoom(r)}>
              <Card style={{ marginTop: 8, backgroundColor: colors.elevated, borderWidth: active?.id === r.id ? 1.5 : 0, borderColor: colors.gold500 }}>
                <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar.Icon size={36} icon="microphone" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontWeight: "700", flex: 1 }} numberOfLines={1}>{r.title}</Text>
                      {r.is_live && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#dc2626" }} />}
                    </View>
                    <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{r.host_name} · {r.participant_count} in room</Text>
                  </View>
                </Card.Content>
              </Card>
            </Pressable>
          ))}
        </Animated.View>
      </ScrollView>
    </ModuleShell>
  );
}
