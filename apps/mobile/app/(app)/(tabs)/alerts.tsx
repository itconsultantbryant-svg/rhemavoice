import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, Chip, Text } from "react-native-paper";
import { api } from "../../../lib/api";
import { useAppSelector } from "../../../store";
import { colors } from "../../../theme";
import { LoadingScreen } from "../../../components/LoadingScreen";
import { ErrorScreen } from "../../../components/ErrorScreen";

type Notification = {
  id: string;
  title: string;
  body: string;
  category: string;
  is_read: boolean;
  action_url?: string;
  created_at?: string;
};

const FILTERS = ["All", "Unread", "Updates"] as const;

export default function AlertsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.notifications
      .list()
      .then((data: any) => setNotifications(data))
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach((n) => set.add(n.category));
    return ["All", ...Array.from(set)];
  }, [notifications]);

  async function markRead(id: string) {
    await api.notifications.read(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function markAllRead() {
    await api.notifications.readAll();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const displayed = notifications.filter((n) => {
    if (filter === "Unread" && n.is_read) return false;
    if (filter === "Updates" && n.category !== "update") return false;
    if (category !== "All" && n.category !== category) return false;
    return true;
  });

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInUp.duration(280)}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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
          {unreadCount > 0 && (
            <Button mode="text" onPress={markAllRead} compact textColor={colors.gold500}>
              Mark all read
            </Button>
          )}
        </View>

        <Text variant="headlineLarge" style={{ color: colors.ink, fontWeight: "800", marginTop: 4 }}>
          Notifications
        </Text>
        <Text style={{ color: colors.inkMuted, fontSize: 14, marginTop: 2 }}>
          All your kingdom updates
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {FILTERS.map((f) => (
            <Chip
              key={f}
              selected={filter === f}
              onPress={() => setFilter(f)}
              style={chipStyle(filter === f)}
              textStyle={{ color: filter === f ? colors.gold500 : colors.inkMuted, fontWeight: "700" }}
            >
              {f === "Unread" ? `Unread (${unreadCount})` : f}
            </Chip>
          ))}
        </View>

        {categories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginTop: 10 }}
          >
            {categories.map((c) => (
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
        )}

        {displayed.length === 0 && (
          <Text style={{ marginTop: 32, textAlign: "center", color: colors.inkMuted }}>
            No notifications yet
          </Text>
        )}

        {displayed.map((n) => (
          <Pressable key={n.id} onPress={() => !n.is_read && markRead(n.id)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Card
              style={{
                marginTop: 10,
                backgroundColor: colors.elevated,
                borderRadius: 14,
                borderLeftWidth: n.is_read ? 0 : 3,
                borderLeftColor: colors.gold500,
                borderWidth: 1,
                borderColor: "rgba(248,245,252,0.08)",
              }}
            >
              <Card.Content style={{ flexDirection: "row", gap: 10 }}>
                <Avatar.Icon
                  size={36}
                  icon={n.category === "update" ? "bell-ring" : "message-text"}
                  color={colors.gold500}
                  style={{ backgroundColor: "rgba(197,160,72,0.12)" }}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontWeight: "700", color: colors.ink, flex: 1 }}>{n.title}</Text>
                    {!n.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold500 }} />}
                  </View>
                  <Text style={{ color: colors.inkMuted, marginTop: 3, fontSize: 13 }}>{n.body}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <Chip compact textStyle={{ color: colors.inkMuted, fontSize: 10 }}>{n.category}</Chip>
                    {n.created_at && (
                      <Text style={{ color: colors.inkMuted, fontSize: 11 }}>{timeAgo(n.created_at)}</Text>
                    )}
                  </View>
                </View>
              </Card.Content>
            </Card>
          </Pressable>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

function chipStyle(selected: boolean) {
  return {
    backgroundColor: selected ? "rgba(197,160,72,0.14)" : colors.elevated,
    borderColor: selected ? "rgba(197,160,72,0.5)" : "rgba(248,245,252,0.08)",
  };
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
