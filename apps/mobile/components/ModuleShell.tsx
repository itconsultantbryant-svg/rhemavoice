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
}

export function ModuleShell({ moduleId, children }: Props) {
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
          <Button onPress={() => router.back()}>Back</Button>
          <Text variant="headlineSmall" style={{ fontWeight: "700", color: colors.navy900 }}>
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
          <Button mode="contained" disabled={!accepted || busy} loading={busy} onPress={saveProfile} style={{ marginTop: 16, backgroundColor: colors.navy900 }}>
            Continue
          </Button>
        </Animated.View>
      </ScrollView>
    );
  }

  if (!ready) return <LoadingScreen />;

  return <>{children}</>;
}
