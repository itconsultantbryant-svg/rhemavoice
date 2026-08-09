import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Avatar,
  Button,
  Card,
  IconButton,
  ProgressBar,
  Text,
  TextInput,
} from "react-native-paper";
import { BRAND, displayName, type DashboardPayload, type ModuleMeta } from "@rhemavoice/shared";
import { api, tokenStore } from "../../../lib/api";
import { setUser, useAppDispatch, useAppSelector } from "../../../store";
import { colors } from "../../../theme";

const MODULE_ICONS: Record<string, string> = {
  church: "church",
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

export default function HomeScreen() {
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
        <Image
          source={require("../../../assets/brand/loading_cover.jpeg")}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
    );
  }

  const greet = `${dash.greeting.replace(/[.,!]$/, "")}, ${displayName(user)}`;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(280)}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Image
            source={require("../../../assets/brand/rhemavoice_logo.jpeg")}
            style={{ width: 44, height: 44, borderRadius: 22 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.gold500,
                letterSpacing: 3,
                textTransform: "uppercase",
                fontSize: 10,
                fontWeight: "700",
              }}
            >
              {BRAND.name}
            </Text>
            <Text
              variant="headlineSmall"
              style={{ color: colors.ink, fontWeight: "800", marginTop: 2 }}
            >
              {greet} 👋
            </Text>
            <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 2 }}>
              {dash.tagline || BRAND.tagline}
            </Text>
          </View>
          <IconButton
            icon="cog-outline"
            iconColor={colors.inkMuted}
            size={22}
            onPress={() => router.push("/(app)/settings")}
          />
        </View>

        {/* Search */}
        <View
          style={{
            marginTop: 14,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.elevated,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(248,245,252,0.08)",
            paddingHorizontal: 12,
          }}
        >
          <IconButton icon="magnify" iconColor={colors.inkMuted} size={20} style={{ margin: 0 }} />
          <TextInput
            placeholder="Search RhemaVoice…"
            placeholderTextColor={colors.inkMuted}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            style={{ flex: 1, backgroundColor: "transparent", height: 46 }}
          />
        </View>

        {/* Modules grid */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 24,
          }}
        >
          <Text variant="titleLarge" style={{ fontWeight: "800", color: colors.ink }}>
            Kingdom Services
          </Text>
          <Text
            style={{ color: colors.gold500, fontSize: 12, fontWeight: "700" }}
            onPress={() => router.push("/(app)/(tabs)/explore")}
          >
            See all →
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
          {modules.map((m, i) => (
            <Animated.View
              key={m.id}
              entering={FadeInDown.delay(i * 30).duration(280)}
              style={{ width: "30%" }}
            >
              <Pressable
                onPress={() => router.push(`/(app)/${m.id}` as Href)}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  backgroundColor: colors.elevated,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderColor: "rgba(248,245,252,0.08)",
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
                <Text
                  style={{
                    fontWeight: "700",
                    color: colors.ink,
                    fontSize: 11,
                    textAlign: "center",
                  }}
                  numberOfLines={2}
                >
                  {m.name}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Live now hero */}
        {dash.live_churches.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
            >
              <Text variant="titleLarge" style={{ fontWeight: "800", color: colors.ink }}>
                Live Now
              </Text>
              <Text
                style={{ color: colors.gold500, fontSize: 12, fontWeight: "700" }}
                onPress={() => router.push("/(app)/streaming")}
              >
                See all →
              </Text>
            </View>

            <Card
              style={{
                marginTop: 12,
                backgroundColor: colors.purple900,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(197,160,72,0.25)",
                overflow: "hidden",
              }}
            >
              <Card.Content style={{ paddingVertical: 18 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: "#22C55E",
                      borderRadius: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" }} />
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>LIVE</Text>
                  </View>
                  <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
                    {dash.live_churches[0].viewers.toLocaleString()} watching
                  </Text>
                </View>
                <Text
                  variant="titleLarge"
                  style={{ color: "#fff", fontWeight: "800", marginTop: 10 }}
                >
                  {dash.live_churches[0].title}
                </Text>
                <Text style={{ color: colors.gold300, marginTop: 4 }}>
                  {dash.live_churches[0].church_name}
                </Text>
                <Button
                  mode="contained"
                  compact
                  style={{ marginTop: 14, alignSelf: "flex-start", backgroundColor: colors.gold500 }}
                  labelStyle={{ color: colors.purple950, fontWeight: "800" }}
                  onPress={() => router.push("/(app)/streaming")}
                >
                  Watch Now
                </Button>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Live churches list */}
        {dash.live_churches.length > 1 && (
          <Section title="Live Churches" onSeeAll={() => router.push("/(app)/streaming")}>
            {dash.live_churches.slice(1).map((l) => (
              <Pressable
                key={l.id}
                onPress={() => router.push("/(app)/streaming")}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Card style={cardStyle}>
                  <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar.Icon
                      size={38}
                      icon="church"
                      color={colors.gold500}
                      style={{ backgroundColor: "rgba(197,160,72,0.12)" }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: colors.ink }} numberOfLines={1}>
                        {l.title}
                      </Text>
                      <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
                        {l.church_name} · {l.viewers.toLocaleString()} watching
                      </Text>
                    </View>
                    <LiveDot />
                  </Card.Content>
                </Card>
              </Pressable>
            ))}
          </Section>
        )}

        {/* Live rooms */}
        {dash.live_rooms.length > 0 && (
          <Section title="Live Rooms" onSeeAll={() => router.push("/(app)/(tabs)/rooms")}>
            {dash.live_rooms.slice(0, 3).map((r) => (
              <Card key={r.id} style={cardStyle}>
                <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar.Text
                    size={38}
                    label={initials(r.title)}
                    color={colors.gold500}
                    style={{ backgroundColor: "rgba(197,160,72,0.12)" }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: colors.ink }} numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
                      {r.host} · {r.participants} in room
                    </Text>
                  </View>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => router.push("/(app)/(tabs)/rooms")}
                    textColor={colors.gold500}
                    style={{ borderColor: "rgba(197,160,72,0.5)" }}
                  >
                    Join
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </Section>
        )}

        {/* Daily verse */}
        <Card style={{ marginTop: 24, ...cardStyle }}>
          <Card.Content>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Avatar.Icon
                size={30}
                icon="book-open-page-variant"
                color={colors.gold500}
                style={{ backgroundColor: "rgba(197,160,72,0.12)" }}
              />
              <Text variant="titleMedium" style={{ fontWeight: "800", color: colors.ink }}>
                Daily Verse
              </Text>
            </View>
            <Text style={{ marginTop: 10, fontStyle: "italic", color: colors.inkMuted }}>
              “{dash.daily_verse.text}”
            </Text>
            <Text style={{ marginTop: 8, color: colors.gold500, fontWeight: "700" }}>
              {dash.daily_verse.reference} · {dash.daily_verse.translation}
            </Text>
          </Card.Content>
        </Card>

        {/* Academy */}
        {dash.academy_courses.length > 0 && (
          <Section title="Continue Learning" onSeeAll={() => router.push("/(app)/academy")}>
            {dash.academy_courses.slice(0, 3).map((c) => (
              <Card key={c.id} style={cardStyle}>
                <Card.Content>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontWeight: "700", color: colors.ink, flex: 1 }} numberOfLines={1}>
                      {c.title}
                    </Text>
                    <Text style={{ color: colors.gold500, fontWeight: "700", marginLeft: 8 }}>
                      {c.progress ?? 0}%
                    </Text>
                  </View>
                  <ProgressBar
                    progress={(c.progress ?? 0) / 100}
                    color={colors.gold500}
                    style={{ marginTop: 8, borderRadius: 4, backgroundColor: "rgba(248,245,252,0.1)" }}
                  />
                </Card.Content>
              </Card>
            ))}
          </Section>
        )}

        {/* Opportunities */}
        {dash.featured_opportunities.length > 0 && (
          <Section title="Opportunities" onSeeAll={() => router.push("/(app)/opportunities")}>
            {dash.featured_opportunities.slice(0, 3).map((o) => (
              <Pressable
                key={o.id}
                onPress={() => router.push("/(app)/opportunities")}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Card style={cardStyle}>
                  <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar.Icon
                      size={38}
                      icon="target"
                      color={colors.gold500}
                      style={{ backgroundColor: "rgba(197,160,72,0.12)" }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: colors.ink }} numberOfLines={1}>
                        {o.title}
                      </Text>
                      <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
                        {o.type} · {o.organization}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </Pressable>
            ))}
          </Section>
        )}

        {/* Footer */}
        <View style={{ marginTop: 28, alignItems: "center", gap: 10 }}>
          <Text style={{ color: colors.gold500, fontWeight: "700", letterSpacing: 2 }}>
            {BRAND.tagline.toUpperCase()}
          </Text>
          <Button
            mode="text"
            compact
            textColor={colors.inkMuted}
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
      </Animated.View>
    </ScrollView>
  );
}

function Section({
  title,
  onSeeAll,
  children,
}: {
  title: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 24 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text variant="titleLarge" style={{ fontWeight: "800", color: colors.ink }}>
          {title}
        </Text>
        {onSeeAll && (
          <Text style={{ color: colors.gold500, fontSize: 12, fontWeight: "700" }} onPress={onSeeAll}>
            See all →
          </Text>
        )}
      </View>
      <View style={{ marginTop: 10, gap: 8 }}>{children}</View>
    </View>
  );
}

const cardStyle = {
  backgroundColor: colors.elevated,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(248,245,252,0.08)",
};

function LiveDot() {
  return (
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" }} />
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
