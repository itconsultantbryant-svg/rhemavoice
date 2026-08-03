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

type ChurchEvent = { id: string; title: string; description: string; location: string };
type Church = {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  pastor_name: string;
  member_count: number;
  is_verified: boolean;
  is_member: boolean;
  my_role: string | null;
  upcoming_events?: ChurchEvent[];
};

export default function ChurchScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [churches, setChurches] = useState<Church[]>([]);
  const [active, setActive] = useState<Church | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.church
      .list()
      .then((data: any) => { setChurches(data); setActive(null); })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.replace("/welcome"); return; }
    load();
  }, [user]);

  async function selectChurch(church: Church) {
    try {
      const detail = (await api.church.get(church.id)) as unknown as Church;
      setActive(detail);
    } catch {
      setActive(church);
    }
  }

  async function joinChurch() {
    if (!active) return;
    await api.church.join(active.id);
    setActive((a) => a && { ...a, is_member: true, my_role: "member", member_count: a.member_count + 1 });
    setChurches((prev) => prev.map((c) => (c.id === active.id ? { ...c, is_member: true, member_count: c.member_count + 1 } : c)));
  }

  async function leaveChurch() {
    if (!active) return;
    await api.church.leave(active.id);
    setActive((a) => a && { ...a, is_member: false, my_role: null, member_count: a.member_count - 1 });
    setChurches((prev) => prev.map((c) => (c.id === active.id ? { ...c, is_member: false, member_count: c.member_count - 1 } : c)));
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => active ? setActive(null) : router.back()} style={{ alignSelf: "flex-start" }}>
          {active ? "Back to churches" : "Back"}
        </Button>

        {active ? (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text variant="headlineSmall" style={{ fontWeight: "700", flex: 1 }}>{active.name}</Text>
              {active.is_verified && <Chip compact icon="check-circle">Verified</Chip>}
            </View>
            <Text style={{ color: colors.gold500, marginTop: 4 }}>
              Pastor {active.pastor_name} · {active.member_count} members
            </Text>
            <Text style={{ color: colors.inkMuted, marginTop: 4 }}>{active.city}, {active.country}</Text>
            <Text style={{ marginTop: 12, color: colors.inkMuted }}>{active.description}</Text>

            <View style={{ marginTop: 16 }}>
              {active.is_member ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Chip icon="check">Member{active.my_role && active.my_role !== "member" ? ` (${active.my_role})` : ""}</Chip>
                  <Button mode="outlined" onPress={leaveChurch} compact>Leave</Button>
                </View>
              ) : (
                <Button mode="contained" onPress={joinChurch} style={{ backgroundColor: colors.navy900 }}>Join Church</Button>
              )}
            </View>

            {active.upcoming_events && active.upcoming_events.length > 0 && (
              <>
                <Text variant="titleMedium" style={{ marginTop: 24, fontWeight: "700" }}>Upcoming Events</Text>
                {active.upcoming_events.map((e) => (
                  <Card key={e.id} style={{ marginTop: 8, backgroundColor: colors.elevated }}>
                    <Card.Content>
                      <Text style={{ fontWeight: "600" }}>{e.title}</Text>
                      {e.location && <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{e.location}</Text>}
                    </Card.Content>
                  </Card>
                ))}
              </>
            )}
          </View>
        ) : (
          <>
            <Text variant="titleLarge" style={{ marginTop: 12, fontWeight: "700" }}>Churches</Text>
            <Text style={{ color: colors.inkMuted, marginTop: 4 }}>Follow churches and ministries</Text>
            {churches.map((c) => (
              <Pressable key={c.id} onPress={() => selectChurch(c)}>
                <Card style={{ marginTop: 10, backgroundColor: colors.elevated }}>
                  <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Avatar.Icon size={40} icon="church" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontWeight: "700" }}>{c.name}</Text>
                        {c.is_verified && <Avatar.Icon size={14} icon="check-circle" color={colors.gold500} style={{ backgroundColor: "transparent" }} />}
                      </View>
                      <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{c.city} · {c.member_count} members</Text>
                    </View>
                    {c.is_member && <Chip compact>Joined</Chip>}
                  </Card.Content>
                </Card>
              </Pressable>
            ))}
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}
