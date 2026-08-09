import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import {
  Avatar,
  Button,
  Card,
  Chip,
  IconButton,
  Text,
  TextInput,
} from "react-native-paper";
import { api } from "../../../lib/api";
import { useAppSelector } from "../../../store";
import { colors } from "../../../theme";
import { LoadingScreen } from "../../../components/LoadingScreen";
import { ErrorScreen } from "../../../components/ErrorScreen";
import { ModuleShell } from "../../../components/ModuleShell";

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

const CATEGORIES = ["All", "Prayer", "Bible Study", "Leadership", "Youth", "Praise", "Fellowship"];
const TABS = ["Explore", "My Rooms", "Scheduled"] as const;

export default function RoomsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [active, setActive] = useState<Room | null>(null);
  const [chatMsg, setChatMsg] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Explore");
  const [category, setCategory] = useState("All");
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
    if (!user) return;
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
    setActive((a) => (a && a.my_participation ? { ...a, my_participation: { ...a.my_participation, hand_raised: !a.my_participation.hand_raised } } : a));
  }

  async function toggleMute() {
    if (!active) return;
    await api.rooms.mute(active.id);
    setActive((a) => (a && a.my_participation ? { ...a, my_participation: { ...a.my_participation, is_muted: !a.my_participation.is_muted } } : a));
  }

  async function sendChat() {
    if (!active || !chatMsg.trim()) return;
    await api.rooms.chat(active.id, chatMsg.trim());
    const msgs = (await api.rooms.messages(active.id)) as any;
    setActive((a) => a && { ...a, chat_messages: msgs });
    setChatMsg("");
  }

  const filtered = rooms.filter((r) => {
    if (tab === "My Rooms" && !r.my_participation) return false;
    if (tab === "Scheduled" && r.is_live) return false;
    if (category !== "All" && !`${r.topic} ${r.title}`.toLowerCase().includes(category.toLowerCase())) return false;
    return true;
  });

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ModuleShell moduleId="rooms" hideBack>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(280)}>
          <Text
            style={{
              color: colors.gold500,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontSize: 10,
              fontWeight: "700",
            }}
          >
            RhemaVoice
          </Text>
          <Text variant="headlineLarge" style={{ color: colors.ink, fontWeight: "800", marginTop: 4 }}>
            Rhema Rooms
          </Text>
          <Text style={{ color: colors.inkMuted, fontSize: 14, marginTop: 2 }}>
            Create. Speak. Grow Together.
          </Text>

          {/* Tabs */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            {TABS.map((t) => (
              <Chip
                key={t}
                selected={tab === t}
                onPress={() => setTab(t)}
                style={chipStyle(tab === t)}
                textStyle={{ color: tab === t ? colors.gold500 : colors.inkMuted, fontWeight: "700" }}
              >
                {t}
              </Chip>
            ))}
          </View>

          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginTop: 12 }}
          >
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                selected={category === c}
                onPress={() => setCategory(c)}
                style={chipStyle(category === c)}
                textStyle={{ color: category === c ? colors.gold500 : colors.inkMuted, fontWeight: "600" }}
              >
                {c}
              </Chip>
            ))}
          </ScrollView>

          {active && (
            <Card
              style={{
                marginTop: 18,
                backgroundColor: colors.purple900,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(197,160,72,0.3)",
              }}
            >
              <Card.Content>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text variant="titleLarge" style={{ fontWeight: "800", color: "#fff", flex: 1 }}>
                    {active.title}
                  </Text>
                  {active.is_live && (
                    <View style={{ backgroundColor: "#22C55E", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>LIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: colors.inkMuted, marginTop: 4 }}>{active.topic || active.description}</Text>
                <Text style={{ color: colors.gold300, fontSize: 12, marginTop: 4 }}>
                  Host: {active.host_name} · {active.participant_count} participants
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
                  {!active.my_participation ? (
                    <Button mode="contained" onPress={joinRoom} compact style={{ backgroundColor: colors.gold500 }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>
                      Join Room
                    </Button>
                  ) : (
                    <>
                      <Button mode="outlined" onPress={leaveRoom} compact textColor={colors.ink}>
                        Leave
                      </Button>
                      <IconButton
                        icon="hand-wave"
                        onPress={raiseHand}
                        iconColor={active.my_participation.hand_raised ? colors.gold500 : colors.inkMuted}
                        size={22}
                      />
                      <IconButton
                        icon={active.my_participation.is_muted ? "microphone-off" : "microphone"}
                        onPress={toggleMute}
                        iconColor={active.my_participation.is_muted ? colors.danger : colors.gold300}
                        size={22}
                      />
                    </>
                  )}
                </View>

                {active.participants_preview && active.participants_preview.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {active.participants_preview.map((p, i) => (
                      <Chip key={i} compact textStyle={{ color: colors.inkMuted }}>
                        {p.display_name}
                        {p.hand_raised ? " ✋" : ""}
                      </Chip>
                    ))}
                  </View>
                )}

                {active.active_poll && (
                  <View style={{ marginTop: 12, padding: 12, backgroundColor: "rgba(197,160,72,0.1)", borderRadius: 10 }}>
                    <Text style={{ fontWeight: "800", color: colors.ink }}>Poll: {active.active_poll.question}</Text>
                    {active.active_poll.options.map((opt, i) => (
                      <Text key={i} style={{ marginTop: 4, color: colors.inkMuted }}>
                        • {opt}
                      </Text>
                    ))}
                  </View>
                )}

                {active.my_participation && (
                  <>
                    <Text variant="titleMedium" style={{ fontWeight: "800", color: colors.ink, marginTop: 14 }}>
                      Room Chat
                    </Text>
                    <View style={{ marginTop: 8, maxHeight: 110 }}>
                      {(active.chat_messages || []).map((m) => (
                        <Text key={m.id} style={{ marginTop: 3, fontSize: 13, color: colors.ink }}>
                          <Text style={{ fontWeight: "700", color: colors.gold500 }}>{m.display_name}: </Text>
                          {m.message}
                        </Text>
                      ))}
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" }}>
                      <TextInput
                        mode="outlined"
                        placeholder="Message…"
                        placeholderTextColor={colors.inkMuted}
                        value={chatMsg}
                        onChangeText={setChatMsg}
                        style={{ flex: 1, backgroundColor: colors.elevated }}
                        dense
                      />
                      <Button mode="contained" onPress={sendChat} compact style={{ backgroundColor: colors.gold500 }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>
                        Send
                      </Button>
                    </View>
                  </>
                )}
              </Card.Content>
            </Card>
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 24 }}>
            <Text variant="titleLarge" style={{ fontWeight: "800", color: colors.ink }}>
              {tab === "Explore" ? "Live Rooms" : tab}
            </Text>
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{filtered.length} rooms</Text>
          </View>

          {filtered.length === 0 && (
            <Text style={{ marginTop: 20, textAlign: "center", color: colors.inkMuted }}>
              No rooms here yet
            </Text>
          )}

          {filtered.map((r) => (
            <Pressable key={r.id} onPress={() => selectRoom(r)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
              <Card
                style={{
                  marginTop: 8,
                  backgroundColor: colors.elevated,
                  borderRadius: 14,
                  borderWidth: active?.id === r.id ? 1.5 : 1,
                  borderColor: active?.id === r.id ? colors.gold500 : "rgba(248,245,252,0.08)",
                }}
              >
                <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar.Text
                    size={40}
                    label={initials(r.title)}
                    color={colors.gold500}
                    style={{ backgroundColor: "rgba(197,160,72,0.12)" }}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontWeight: "700", color: colors.ink, flex: 1 }} numberOfLines={1}>
                        {r.title}
                      </Text>
                      {r.is_live && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" }} />}
                    </View>
                    <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
                      {r.host_name} · {r.participant_count} in room
                    </Text>
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

function chipStyle(selected: boolean) {
  return {
    backgroundColor: selected ? "rgba(197,160,72,0.14)" : colors.elevated,
    borderColor: selected ? "rgba(197,160,72,0.5)" : "rgba(248,245,252,0.08)",
  };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
