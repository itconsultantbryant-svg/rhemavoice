import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, IconButton, Text } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";

type Station = {
  id: string;
  name: string;
  genre: string;
  description: string;
  presenters: string;
  is_live: boolean;
  listeners: number;
  is_favorite: boolean;
  podcasts?: Array<{ id: string; title: string; host: string; duration_min: number }>;
};

export default function RadioScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [stations, setStations] = useState<Station[]>([]);
  const [active, setActive] = useState<Station | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.radio
      .stations()
      .then((data: any) => {
        setStations(data);
        setActive(data.find((s: Station) => s.is_live) || data[0] || null);
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

  async function toggleFavorite(id: string) {
    await api.radio.favorite(id);
    setStations((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_favorite: !s.is_favorite } : s))
    );
    if (active?.id === id) setActive((a) => a && { ...a, is_favorite: !a.is_favorite });
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
          Back
        </Button>

        {active && (
          <Card style={{ marginTop: 12, backgroundColor: colors.navy900, borderRadius: 16 }}>
            <Card.Content style={{ alignItems: "center", paddingVertical: 24 }}>
              <Avatar.Icon size={56} icon="radio" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.2)" }} />
              <Text variant="titleLarge" style={{ color: "#fff", fontWeight: "700", marginTop: 12 }}>
                {active.name}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{active.genre}</Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4 }}>{active.presenters}</Text>
              {active.is_live && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#dc2626" }} />
                  <Text style={{ color: colors.gold500 }}>{active.listeners} listeners</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 }}>
                <IconButton
                  icon={active.is_favorite ? "heart" : "heart-outline"}
                  iconColor={colors.gold500}
                  onPress={() => toggleFavorite(active.id)}
                />
                <IconButton
                  icon={playing ? "pause-circle" : "play-circle"}
                  iconColor="#fff"
                  size={48}
                  onPress={() => setPlaying((p) => !p)}
                />
                <View style={{ width: 48 }} />
              </View>
            </Card.Content>
          </Card>
        )}

        {active?.podcasts && active.podcasts.length > 0 && (
          <>
            <Text variant="titleMedium" style={{ marginTop: 20, fontWeight: "700" }}>Podcasts</Text>
            {active.podcasts.map((p) => (
              <Card key={p.id} style={{ marginTop: 8, backgroundColor: colors.elevated }}>
                <Card.Content style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "600" }}>{p.title}</Text>
                    <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{p.host} · {p.duration_min} min</Text>
                  </View>
                  <IconButton icon="play" size={20} />
                </Card.Content>
              </Card>
            ))}
          </>
        )}

        <Text variant="titleLarge" style={{ marginTop: 24, fontWeight: "700" }}>Stations</Text>
        {stations.map((s) => (
          <Pressable key={s.id} onPress={() => { setActive(s); setPlaying(false); }}>
            <Card style={{ marginTop: 8, backgroundColor: colors.elevated, borderWidth: active?.id === s.id ? 1.5 : 0, borderColor: colors.gold500 }}>
              <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar.Icon size={40} icon="radio" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontWeight: "700" }}>{s.name}</Text>
                    {s.is_live && (
                      <View style={{ backgroundColor: "#dc2626", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{s.genre} · {s.listeners} listeners</Text>
                </View>
              </Card.Content>
            </Card>
          </Pressable>
        ))}
      </Animated.View>
    </ScrollView>
  );
}
