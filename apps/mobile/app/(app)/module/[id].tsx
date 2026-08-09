import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button, Checkbox, Text, TextInput } from "react-native-paper";
import type { ModuleMeta } from "@rhemavoice/shared";
import { api } from "../../../lib/api";
import { colors } from "../../../theme";

const FIELDS: Record<string, string[]> = {
  academy: ["Education Level", "Country", "Church", "Occupation", "Learning Goals", "Phone"],
  learn: ["Learning Interests", "Country", "Language", "Phone", "Goals"],
  business: ["Business Name", "Category", "Country", "Phone"],
  opportunities: ["Seeking / Hiring", "Industry", "Country", "Phone"],
  rooms: ["Display Name", "Country", "Interests", "Phone"],
};

const OVERVIEW: Record<string, string> = {
  streaming: "Watch live church services, follow ministries, and access sermon replays.",
  academy: "Multi-partner LMS — enroll in courses from Chayil and partner academies.",
  learn: "Voice-based lessons, language education, and learning communities.",
  radio: "Live radio stations, program schedules, and podcasts.",
  business: "Discover kingdom businesses, products, services, and reviews.",
  rooms: "Join voice rooms for prayer, Bible study, teaching, and fellowship.",
  opportunities: "Browse jobs, scholarships, grants, and loans from approved partners.",
  transport: "Book transportation services with approved providers across Liberia.",
  ticketing: "Discover events and purchase tickets from approved organizers.",
  air: "Search and book flights through approved travel agencies.",
};

export default function ModuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const moduleId = String(id);
  const [meta, setMeta] = useState<ModuleMeta | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.modules.list().then((list) => {
      const m = list.find((x) => x.id === moduleId) || null;
      setMeta(m);
      setNeedsProfile(!!m?.requires_profile && !m.profile_complete);
    });
  }, [moduleId]);

  async function saveProfile() {
    setBusy(true);
    try {
      await api.modules.saveProfile(moduleId, { ...form, accepted_terms: accepted });
      setNeedsProfile(false);
    } finally {
      setBusy(false);
    }
  }

  if (!meta) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Opening…</Text>
      </View>
    );
  }

  if (needsProfile) {
    const fields = FIELDS[moduleId] || ["Full Name", "Country", "Phone"];
    return (
      <ScrollView contentContainerStyle={{ padding: 20 }} style={{ backgroundColor: colors.surface }}>
        <Animated.View entering={FadeInUp.duration(280)}>
          <Button onPress={() => router.back()}>Back</Button>
          <Text variant="headlineSmall" style={{ fontWeight: "700", color: colors.ink }}>
            Complete {meta.name} Registration
          </Text>
          {fields.map((label) => {
            const key = label.toLowerCase().replace(/\s+/g, "_");
            return (
              <TextInput
                key={key}
                mode="outlined"
                label={label}
                value={form[key] || ""}
                onChangeText={(t) => setForm((f) => ({ ...f, [key]: t }))}
                style={{ marginTop: 10 }}
              />
            );
          })}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <Checkbox status={accepted ? "checked" : "unchecked"} onPress={() => setAccepted((v) => !v)} />
            <Text>Accept Terms</Text>
          </View>
          <Button mode="contained" disabled={!accepted || busy} loading={busy} onPress={saveProfile} style={{ marginTop: 16, backgroundColor: colors.gold500 }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>
            Continue
          </Button>
        </Animated.View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} style={{ backgroundColor: colors.surface }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => router.back()}>Back</Button>
        {moduleId === "academy" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
            <Image source={require("../../../assets/brand/chayil_logo.jpeg")} style={{ width: 56, height: 56, borderRadius: 14 }} />
            <View>
              <Text style={{ color: colors.gold500, letterSpacing: 2, textTransform: "uppercase", fontSize: 10 }}>Institution</Text>
              <Text style={{ fontWeight: "700", color: colors.ink, fontSize: 18 }}>Chayil</Text>
              <Text style={{ color: colors.inkMuted, fontSize: 12 }}>Under Rhema Academy</Text>
            </View>
          </View>
        ) : (
          <Image source={require("../../../assets/brand/rhemavoice_logo.jpeg")} style={{ width: 44, height: 44, borderRadius: 22, marginTop: 8 }} />
        )}
        <Text style={{ color: colors.gold500, letterSpacing: 3, textTransform: "uppercase", fontSize: 11, marginTop: 16 }}>RhemaVoice</Text>
        <Text variant="headlineMedium" style={{ fontWeight: "700", color: colors.ink, marginTop: 6 }}>{meta.name}</Text>
        <Text style={{ color: colors.inkMuted, marginTop: 8 }}>{meta.description}</Text>
        <View style={{ marginTop: 20, backgroundColor: colors.elevated, borderRadius: 14, padding: 16 }}>
          <Text variant="titleMedium">Overview</Text>
          <Text style={{ marginTop: 8, color: colors.inkMuted }}>{OVERVIEW[moduleId] || meta.description}</Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
