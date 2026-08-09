import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button, Card, Chip, Text, TextInput } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";
import { ModuleShell } from "../../components/ModuleShell";

type Opportunity = {
  id: string;
  type: string;
  title: string;
  organization: string;
  description: string;
  location: string;
  country: string;
  category: string;
  amount_label?: string;
  deadline?: string;
  is_saved: boolean;
};

const FILTERS = ["all", "job", "scholarship", "grant", "loan"] as const;

export default function OpportunitiesScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [items, setItems] = useState<Opportunity[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [active, setActive] = useState<Opportunity | null>(null);
  const [coverNote, setCoverNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load(type?: string) {
    setLoading(true);
    setError("");
    api.opportunities
      .list(type === "all" ? undefined : type)
      .then((data: any) => { setItems(data); setActive(null); })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.replace("/welcome"); return; }
    load(filter);
  }, [user, filter]);

  async function toggleSave(id: string) {
    await api.opportunities.save(id);
    setItems((prev) => prev.map((o) => (o.id === id ? { ...o, is_saved: !o.is_saved } : o)));
    if (active?.id === id) setActive((a) => a && { ...a, is_saved: !a.is_saved });
  }

  async function apply() {
    if (!active) return;
    await api.opportunities.apply(active.id, coverNote.trim());
    setCoverNote("");
    setActive(null);
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={() => load(filter)} />;

  return (
    <ModuleShell moduleId="opportunities">
      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Animated.View entering={FadeInUp.duration(280)}>
          <Button onPress={() => active ? setActive(null) : router.back()} style={{ alignSelf: "flex-start" }}>
            {active ? "Back to list" : "Back"}
          </Button>

          {active ? (
            <View style={{ marginTop: 12 }}>
              <Chip compact style={{ alignSelf: "flex-start" }}>{active.type}</Chip>
              <Text variant="headlineSmall" style={{ fontWeight: "700", marginTop: 8 }}>{active.title}</Text>
              <Text style={{ color: colors.gold500, marginTop: 4 }}>{active.organization}</Text>
              <Text style={{ color: colors.inkMuted, marginTop: 12 }}>{active.description}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {active.location && <Chip compact icon="map-marker">{active.location}</Chip>}
                {active.category && <Chip compact>{active.category}</Chip>}
                {active.amount_label && <Chip compact icon="currency-usd">{active.amount_label}</Chip>}
              </View>
              {active.deadline && <Text style={{ marginTop: 8, color: colors.inkMuted, fontSize: 12 }}>Deadline: {active.deadline}</Text>}

              <TextInput mode="outlined" label="Cover note (optional)" value={coverNote} onChangeText={setCoverNote} multiline style={{ marginTop: 16 }} />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <Button mode="contained" onPress={apply} style={{ flex: 1, backgroundColor: colors.gold500 }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>Apply</Button>
                <Button mode="outlined" onPress={() => toggleSave(active.id)}>{active.is_saved ? "Unsave" : "Save"}</Button>
              </View>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {FILTERS.map((f) => (
                  <Chip
                    key={f}
                    selected={filter === f}
                    onPress={() => setFilter(f)}
                    style={{ marginRight: 6 }}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
                  </Chip>
                ))}
              </ScrollView>

              <Text variant="titleLarge" style={{ marginTop: 16, fontWeight: "700" }}>Opportunities</Text>
              {items.map((o) => (
                <Pressable key={o.id} onPress={() => setActive(o)}>
                  <Card style={{ marginTop: 10, backgroundColor: colors.elevated }}>
                    <Card.Content>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "700" }}>{o.title}</Text>
                          <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{o.organization}</Text>
                          {o.location && <Text style={{ color: colors.inkMuted, fontSize: 11 }}>{o.location}</Text>}
                        </View>
                        <Chip compact>{o.type}</Chip>
                      </View>
                    </Card.Content>
                  </Card>
                </Pressable>
              ))}
            </>
          )}
        </Animated.View>
      </ScrollView>
    </ModuleShell>
  );
}
