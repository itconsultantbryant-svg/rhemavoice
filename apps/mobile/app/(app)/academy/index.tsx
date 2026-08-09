import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button, Text } from "react-native-paper";
import { api } from "../../../lib/api";
import { useAppSelector } from "../../../store";
import { colors } from "../../../theme";

type Academy = {
  id: string;
  code: string;
  name: string;
  tagline: string;
  program_weeks?: number;
  student_count?: number;
  is_featured?: boolean;
};

export default function AcademyChoose() {
  const user = useAppSelector((s) => s.auth.user);
  const [academies, setAcademies] = useState<Academy[]>([]);

  useEffect(() => {
    if (!user) {
      router.replace("/welcome");
      return;
    }
    api.academy.institutions().then((list) => setAcademies(list as Academy[]));
  }, [user]);

  const featured = academies.find((a) => a.is_featured) || academies.find((a) => a.code === "chayil");
  const others = academies.filter((a) => a.id !== featured?.id);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => router.back()}>← Home</Button>
        <Text style={{ color: colors.gold500, letterSpacing: 2, textTransform: "uppercase", fontSize: 11, marginTop: 8 }}>
          Rhema Academy
        </Text>
        <Text variant="headlineMedium" style={{ fontWeight: "700", color: colors.ink, marginTop: 4 }}>
          Choose your academy
        </Text>
        <Text style={{ color: colors.inkMuted, marginTop: 8 }}>
          RhemaVoice hosts the platform. Your organization runs the program.
        </Text>

        {featured && (
          <Pressable
            onPress={() => router.push(`/(app)/academy/${featured.code}`)}
            style={{
              marginTop: 20,
              backgroundColor: colors.navy900,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Image
                source={require("../../../assets/brand/chayil_logo.jpeg")}
                style={{ width: 56, height: 56, borderRadius: 14 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.gold300, fontSize: 11, letterSpacing: 1 }}>FEATURED</Text>
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18, marginTop: 4 }}>{featured.name}</Text>
                <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 4, fontSize: 13 }}>{featured.tagline}</Text>
              </View>
            </View>
            <Text style={{ color: colors.gold300, marginTop: 16, fontSize: 13 }}>
              {featured.program_weeks || 31} Weeks · {featured.student_count || 0} Students
            </Text>
            <Text style={{ color: colors.gold500, marginTop: 12, fontWeight: "700" }}>Enter Academy →</Text>
          </Pressable>
        )}

        <Text variant="titleMedium" style={{ marginTop: 24, fontWeight: "700" }}>
          Other academies
        </Text>
        {others.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => router.push(`/(app)/academy/${a.code}`)}
            style={{
              marginTop: 10,
              backgroundColor: colors.elevated,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: "rgba(248,245,252,0.08)",
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.ink }}>{a.name}</Text>
            <Text style={{ color: colors.inkMuted, marginTop: 4, fontSize: 13 }}>{a.tagline}</Text>
          </Pressable>
        ))}
      </Animated.View>
    </ScrollView>
  );
}
