import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Avatar, Text } from "react-native-paper";
import { type ModuleId, type ModuleMeta } from "@rhemavoice/shared";
import { api } from "../../../lib/api";
import { useAppSelector } from "../../../store";
import { colors } from "../../../theme";

const MODULE_ICONS: Record<string, string> = {
  streaming: "church",
  academy: "school",
  learn: "book-open-page-variant",
  radio: "radio",
  rooms: "microphone",
  business: "briefcase",
  opportunities: "target",
  transport: "car",
  ticketing: "ticket",
  air: "airplane",
};

const WORSHIP = ["streaming", "academy", "learn", "radio", "rooms"] as ModuleId[];
const MARKETPLACE = ["business", "opportunities", "transport", "ticketing", "air"] as ModuleId[];

type Group = { title: string; subtitle: string; ids: ModuleId[] };

const GROUPS: Group[] = [
  { title: "Worship & Learning", subtitle: "Stream, study, and grow together", ids: WORSHIP },
  { title: "Marketplace & Travel", subtitle: "Do business, travel, and celebrate", ids: MARKETPLACE },
];

export default function ExploreScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [modules, setModules] = useState<ModuleMeta[]>([]);

  useEffect(() => {
    if (!user) {
      router.replace("/welcome");
      return;
    }
    api.modules.list().then(setModules);
  }, [user]);

  const byId = new Map(modules.map((m) => [m.id, m]));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(280)}>
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
          Explore
        </Text>
        <Text style={{ color: colors.inkMuted, fontSize: 14, marginTop: 4 }}>
          Every kingdom service in one place
        </Text>

        {GROUPS.map((group, gi) => (
          <View key={group.title} style={{ marginTop: gi === 0 ? 28 : 32 }}>
            <Text variant="titleLarge" style={{ fontWeight: "800", color: colors.ink }}>
              {group.title}
            </Text>
            <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 2 }}>
              {group.subtitle}
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
              {group.ids.map((id, i) => {
                const m = byId.get(id);
                if (!m) return null;
                return (
                  <Animated.View
                    key={m.id}
                    entering={FadeInDown.delay(gi * 60 + i * 30).duration(280)}
                    style={{ width: "48%" }}
                  >
                    <Pressable
                      onPress={() => router.push(`/(app)/${m.id}` as Href)}
                      style={({ pressed }) => ({
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                        backgroundColor: colors.elevated,
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: "rgba(248,245,252,0.08)",
                        minHeight: 118,
                      })}
                    >
                      <Avatar.Icon
                        size={40}
                        icon={MODULE_ICONS[m.id] || "apps"}
                        color={colors.gold500}
                        style={{ backgroundColor: "rgba(197,160,72,0.12)" }}
                      />
                      <Text
                        style={{
                          fontWeight: "800",
                          color: colors.ink,
                          fontSize: 14,
                          marginTop: 10,
                        }}
                        numberOfLines={2}
                      >
                        {m.name}
                      </Text>
                      <Text
                        style={{ color: colors.inkMuted, fontSize: 11, marginTop: 4 }}
                        numberOfLines={2}
                      >
                        {m.description}
                      </Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        ))}
      </Animated.View>
    </ScrollView>
  );
}
