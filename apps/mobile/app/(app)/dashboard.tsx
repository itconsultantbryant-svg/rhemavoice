import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Avatar, Button, Card, ProgressBar, Text, TextInput } from "react-native-paper";
import { BRAND, type DashboardPayload, type ModuleMeta } from "@rhemavoice/shared";
import { api, tokenStore } from "../../lib/api";
import { setUser, useAppDispatch, useAppSelector } from "../../store";
import { colors } from "../../theme";

const MODULE_ICONS: Record<string, string> = {
  video: "video",
  "graduation-cap": "school",
  "book-open": "book-open-page-variant",
  radio: "radio",
  briefcase: "briefcase",
  mic: "microphone",
  target: "target",
  car: "car",
  ticket: "ticket",
  plane: "airplane",
};

export default function Dashboard() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [dash, setDash] = useState<DashboardPayload | null>(null);
  const [modules, setModules] = useState<ModuleMeta[]>([]);

  useEffect(() => {
    if (!user) {
      router.replace("/welcome");
      return;
    }
    Promise.all([api.dashboard.get(), api.modules.list()]).then(([d, m]) => {
      setDash(d);
      setModules(m);
    });
  }, [user]);

  if (!user || !dash) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.purple950 }}>
        <Image source={require("../../assets/brand/loading_cover.jpeg")} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInDown.duration(280)}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Image source={require("../../assets/brand/rhemavoice_logo.jpeg")} style={{ width: 44, height: 44, borderRadius: 22 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.gold500, letterSpacing: 3, textTransform: "uppercase", fontSize: 11 }}>{BRAND.name}</Text>
            <Text variant="headlineSmall" style={{ color: colors.navy900, fontWeight: "700", marginTop: 2 }}>
              {dash.greeting}
            </Text>
            <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 2 }}>{dash.tagline || BRAND.tagline}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Link href="/(app)/settings" asChild>
            <Button mode="outlined" compact>Settings</Button>
          </Link>
          <Button
            mode="text"
            onPress={async () => {
              await api.auth.logout();
              await tokenStore.clearTokens();
              dispatch(setUser(null));
              router.replace("/welcome");
            }}
          >
            Log out
          </Button>
        </View>

        <TextInput mode="outlined" placeholder="Search churches, courses, jobs, events…" style={{ marginTop: 16 }} />

        <Card style={{ marginTop: 16, backgroundColor: colors.elevated }}>
          <Card.Content>
            <Text variant="titleMedium">Daily Verse</Text>
            <Text style={{ marginTop: 8, fontStyle: "italic", color: colors.inkMuted }}>&ldquo;{dash.daily_verse.text}&rdquo;</Text>
            <Text style={{ marginTop: 8, color: colors.gold500 }}>
              {dash.daily_verse.reference} · {dash.daily_verse.translation}
            </Text>
          </Card.Content>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Card.Content>
            <Text variant="titleMedium">Live Churches</Text>
            {dash.live_churches.map((l) => (
              <Text key={l.id} style={{ marginTop: 8 }}>{l.title} · {l.church_name} · {l.viewers} watching</Text>
            ))}
          </Card.Content>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Card.Content>
            <Text variant="titleMedium">Rhema Academy</Text>
            {dash.academy_courses.map((c) => (
              <View key={c.id} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text>{c.title}</Text>
                  <Text>{c.progress ?? 0}%</Text>
                </View>
                <ProgressBar progress={(c.progress ?? 0) / 100} color={colors.gold500} style={{ marginTop: 6 }} />
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <Card.Content>
            <Text variant="titleMedium">Featured Opportunities</Text>
            {dash.featured_opportunities.map((o) => (
              <Text key={o.id} style={{ marginTop: 8 }}>{o.title} · {o.organization}</Text>
            ))}
          </Card.Content>
        </Card>

        <Text variant="titleLarge" style={{ marginTop: 20, fontWeight: "700" }}>
          Platform Modules
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          {modules.map((m, i) => (
            <Animated.View key={m.id} entering={FadeInDown.delay(i * 30).duration(280)} style={{ width: "30%" }}>
              <Pressable
                onPress={() => router.push(`/(app)/module/${m.id}`)}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  backgroundColor: colors.elevated,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderColor: "rgba(16,0,48,0.08)",
                  alignItems: "center",
                  gap: 8,
                })}
              >
                <Avatar.Icon
                  size={44}
                  icon={MODULE_ICONS[m.icon] || "apps"}
                  color={colors.gold500}
                  style={{ backgroundColor: "rgba(197,160,72,0.12)" }}
                />
                <Text style={{ fontWeight: "700", color: colors.navy900, fontSize: 11, textAlign: "center" }} numberOfLines={2}>
                  {m.name}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}
