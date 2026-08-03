import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, Text, TextInput } from "react-native-paper";
import { api, tokenStore } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";

type Conversation = {
  id: string;
  title: string;
  is_group: boolean;
  participants: string[];
  last_message?: string;
  unread_count?: number;
};

type Message = {
  id: string;
  sender_name: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function ChatScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  function load() {
    setLoading(true);
    setError("");
    api.chat
      .conversations()
      .then((data: any) => { setConversations(data); setActive(null); })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.replace("/welcome"); return; }
    load();
    return () => { wsRef.current?.close(); };
  }, [user]);

  async function openConversation(conv: Conversation) {
    setActive(conv);
    const msgs = (await api.chat.messages(conv.id)) as unknown as Message[];
    setMessages(msgs);

    wsRef.current?.close();
    const token = await tokenStore.getAccessToken();
    if (token) {
      try {
        const wsBase = "ws://localhost:8000";
        const ws = new WebSocket(`${wsBase}/ws/chat/${conv.id}/?token=${token}`);
        ws.onmessage = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.type === "chat_message") {
            setMessages((prev) => [...prev, data.message]);
          }
        };
        wsRef.current = ws;
      } catch {}
    }
  }

  async function send() {
    if (!active || !text.trim()) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ body: text.trim() }));
    } else {
      await api.chat.send(active.id, text.trim());
      const msgs = (await api.chat.messages(active.id)) as unknown as Message[];
      setMessages(msgs);
    }
    setText("");
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  if (active) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.surface }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}>
            <Button onPress={() => { setActive(null); wsRef.current?.close(); }}>Back</Button>
            <Text variant="titleMedium" style={{ fontWeight: "700", flex: 1 }}>{active.title || "Chat"}</Text>
          </View>

          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item: m }) => {
              const isMe = m.sender_id === user?.id;
              return (
                <View style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "80%", marginTop: 6 }}>
                  {!isMe && <Text style={{ fontSize: 10, color: colors.gold500, marginBottom: 2 }}>{m.sender_name}</Text>}
                  <View style={{ backgroundColor: isMe ? colors.navy900 : colors.elevated, borderRadius: 12, padding: 10 }}>
                    <Text style={{ color: isMe ? "#fff" : colors.navy900 }}>{m.body}</Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderColor: "rgba(0,0,0,0.08)" }}>
            <TextInput mode="outlined" placeholder="Message…" value={text} onChangeText={setText} style={{ flex: 1 }} dense />
            <Button mode="contained" onPress={send} compact style={{ backgroundColor: colors.navy900, justifyContent: "center" }}>Send</Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>Back</Button>
        <Text variant="titleLarge" style={{ marginTop: 8, fontWeight: "700" }}>Messages</Text>

        {conversations.length === 0 && (
          <Text style={{ marginTop: 24, textAlign: "center", color: colors.inkMuted }}>No conversations yet</Text>
        )}

        {conversations.map((c) => (
          <Pressable key={c.id} onPress={() => openConversation(c)}>
            <Card style={{ marginTop: 10, backgroundColor: colors.elevated }}>
              <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar.Icon size={40} icon={c.is_group ? "account-group" : "account"} color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700" }}>{c.title || c.participants.join(", ")}</Text>
                  {c.last_message && <Text style={{ color: colors.inkMuted, fontSize: 12 }} numberOfLines={1}>{c.last_message}</Text>}
                </View>
                {(c.unread_count ?? 0) > 0 && (
                  <View style={{ backgroundColor: colors.gold500, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{c.unread_count}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          </Pressable>
        ))}
      </Animated.View>
    </ScrollView>
  );
}
