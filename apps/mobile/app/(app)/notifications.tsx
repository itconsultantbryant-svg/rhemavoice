import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button, Card, Chip, Text } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";

type Notification = {
  id: string;
  title: string;
  body: string;
  category: string;
  is_read: boolean;
  action_url?: string;
  created_at?: string;
};

export default function NotificationsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
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
    if (!user) { router.replace("/welcome"); return; }
    load();
  }, [user]);

  async function markRead(id: string) {
    await api.notifications.read(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function markAllRead() {
    await api.notifications.readAll();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const displayed = showUnreadOnly ? notifications.filter((n) => !n.is_read) : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Button onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>Back</Button>
          {unreadCount > 0 && (
            <Button mode="text" onPress={markAllRead} compact>Mark all read</Button>
          )}
        </View>

        <Text variant="titleLarge" style={{ marginTop: 8, fontWeight: "700" }}>Notifications</Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Chip selected={!showUnreadOnly} onPress={() => setShowUnreadOnly(false)}>All</Chip>
          <Chip selected={showUnreadOnly} onPress={() => setShowUnreadOnly(true)}>Unread ({unreadCount})</Chip>
        </View>

        {displayed.length === 0 && (
          <Text style={{ marginTop: 24, textAlign: "center", color: colors.inkMuted }}>No notifications</Text>
        )}

        {displayed.map((n) => (
          <Pressable key={n.id} onPress={() => !n.is_read && markRead(n.id)}>
            <Card style={{ marginTop: 10, backgroundColor: colors.elevated, borderLeftWidth: n.is_read ? 0 : 3, borderLeftColor: colors.gold500 }}>
              <Card.Content>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {!n.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold500 }} />}
                  <Text style={{ fontWeight: "700", flex: 1 }}>{n.title}</Text>
                  <Chip compact>{n.category}</Chip>
                </View>
                <Text style={{ color: colors.inkMuted, marginTop: 4, fontSize: 13 }}>{n.body}</Text>
              </Card.Content>
            </Card>
          </Pressable>
        ))}
      </Animated.View>
    </ScrollView>
  );
}
