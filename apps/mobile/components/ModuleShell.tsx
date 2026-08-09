import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button, Checkbox, Text, TextInput } from "react-native-paper";
import { router } from "expo-router";
import type { ModuleMeta } from "@rhemavoice/shared";
import { api } from "../lib/api";
import { colors } from "../theme";
import { LoadingScreen } from "./LoadingScreen";

const FIELDS: Record<string, string[]> = {
  academy: ["Education Level", "Country", "Church", "Occupation", "Learning Goals", "Phone"],
  learn: ["Learning Interests", "Country", "Language", "Phone", "Goals"],
  business: ["Business Name", "Category", "Country", "Phone"],
  opportunities: ["Seeking / Hiring", "Industry", "Country", "Phone"],
  rooms: ["Display Name", "Country", "Interests", "Phone"],
};

interface Props {
  moduleId: string;
  children: React.ReactNode;
  /** Hide the "Back" button — use when embedded in a tab (no stack to pop). */
  hideBack?: boolean;
}

export function ModuleShell({ moduleId, children, hideBack = false }: Props) {
  const [meta, setMeta] = useState<ModuleMeta | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.modules.list().then((list) => {
      const m = list.find((x) => x.id === moduleId) || null;
      setMeta(m);
      if (m?.requires_profile && !m.profile_complete) {
        setNeedsProfile(true);
      } else {
        setReady(true);
      }
    });
  }, [moduleId]);

  async function saveProfile() {
    setBusy(true);
    try {
      await api.modules.saveProfile(moduleId, { ...form, accepted_terms: accepted });
      setNeedsProfile(false);
      setReady(true);
    } finally {
      setBusy(false);
    }
  }

  if (!meta) return <LoadingScreen />;

  if (needsProfile) {
    const fields = FIELDS[moduleId] || ["Full Name", "Country", "Phone"];
    return (
      <ScrollView contentContainerStyle={{ padding: 20 }} style={{ backgroundColor: colors.surface }}>
        <Animated.View entering={FadeInUp.duration(280)}>
          {!hideBack && <Button onPress={() => router.back()}>Back</Button>}
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: colors.ink, marginTop: 8 }}>
            Complete {meta.name} Registration
          </Text>
          <Text style={{ color: colors.inkMuted, marginTop: 4 }}>
            A short profile unlocks this module for you.
          </Text>
          {fields.map((label) => {
            const key = label.toLowerCase().replace(/\s+/g, "_");
            return (
              <TextInput
                key={key}
                mode="outlined"
                label={label}
                textColor={colors.ink}
                value={form[key] || ""}
                onChangeText={(t) => setForm((f) => ({ ...f, [key]: t }))}
                style={{ marginTop: 10, backgroundColor: colors.elevated }}
              />
            );
          })}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <Checkbox status={accepted ? "checked" : "unchecked"} onPress={() => setAccepted((v) => !v)} />
            <Text style={{ color: colors.inkMuted }}>Accept Terms</Text>
          </View>
          <Button
            mode="contained"
            disabled={!accepted || busy}
            loading={busy}
            onPress={saveProfile}
            style={{ marginTop: 16, backgroundColor: colors.gold500 }}
            labelStyle={{ color: colors.purple950, fontWeight: "800" }}
          >
            Continue
          </Button>
        </Animated.View>
      </ScrollView>
    );
  }

  if (!ready) return <LoadingScreen />;

  return <>{children}</>;
}
