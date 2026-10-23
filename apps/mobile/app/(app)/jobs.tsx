import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, Chip, Text, TextInput } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";

type Job = {
  id: string;
  title: string;
  company_name: string;
  location: string;
  employment_type: string;
  is_remote: boolean;
  description: string;
  salary_range: string;
  is_saved: boolean;
  has_applied: boolean;
};

export default function JobsScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [active, setActive] = useState<Job | null>(null);
  const [coverNote, setCoverNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.jobs
      .list()
      .then((data) => {
        const list = data as unknown as Job[];
        setJobs(list);
        setActive((current) => (current ? list.find((j) => j.id === current.id) || null : null));
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

  function patch(id: string, change: (job: Job) => Job) {
    setJobs((prev) => prev.map((j) => (j.id === id ? change(j) : j)));
    setActive((current) => (current?.id === id ? change(current) : current));
  }

  async function toggleSave(job: Job) {
    const result = (await api.jobs.save(job.id)) as { saved: boolean };
    patch(job.id, (j) => ({ ...j, is_saved: result.saved }));
  }

  async function apply() {
    if (!active) return;
    await api.jobs.apply(active.id, coverNote.trim());
    setCoverNote("");
    patch(active.id, (j) => ({ ...j, has_applied: true }));
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => (active ? setActive(null) : router.back())} style={{ alignSelf: "flex-start" }}>
          {active ? "Back to jobs" : "Back"}
        </Button>

        {active ? (
          <View style={{ marginTop: 12 }}>
            <Text variant="headlineSmall" style={{ fontWeight: "800" }}>{active.title}</Text>
            <Text style={{ color: colors.gold500, marginTop: 4 }}>{active.company_name}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {active.location && <Chip compact icon="map-marker">{active.location}</Chip>}
              {active.employment_type && <Chip compact>{active.employment_type}</Chip>}
              {active.is_remote && <Chip compact icon="laptop">Remote</Chip>}
              {active.salary_range && <Chip compact icon="currency-usd">{active.salary_range}</Chip>}
            </View>
            <Text style={{ color: colors.inkMuted, marginTop: 14, lineHeight: 20 }}>{active.description}</Text>

            {active.has_applied ? (
              <Card style={{ marginTop: 16, backgroundColor: colors.elevated }}>
                <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar.Icon size={32} icon="check" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
                  <Text style={{ fontWeight: "600" }}>Application submitted</Text>
                </Card.Content>
              </Card>
            ) : (
              <>
                <TextInput
                  mode="outlined"
                  label="Cover note (optional)"
                  value={coverNote}
                  onChangeText={setCoverNote}
                  multiline
                  style={{ marginTop: 16 }}
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <Button mode="contained" onPress={apply} style={{ flex: 1, backgroundColor: colors.gold500 }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>
                    Apply now
                  </Button>
                  <Button mode="outlined" onPress={() => toggleSave(active)}>
                    {active.is_saved ? "Unsave" : "Save"}
                  </Button>
                </View>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
              <Avatar.Icon size={44} icon="briefcase-outline" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
              <View>
                <Text variant="headlineSmall" style={{ fontWeight: "800" }}>Jobs</Text>
                <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{jobs.length} open roles</Text>
              </View>
            </View>

            {jobs.map((job) => (
              <Pressable key={job.id} onPress={() => setActive(job)}>
                <Card style={{ marginTop: 10, backgroundColor: colors.elevated }}>
                  <Card.Content>
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700" }}>{job.title}</Text>
                        <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 2 }}>
                          {job.company_name}{job.location ? ` · ${job.location}` : ""}
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {job.employment_type && <Chip compact>{job.employment_type}</Chip>}
                          {job.is_remote && <Chip compact icon="laptop">Remote</Chip>}
                          {job.has_applied && <Chip compact icon="check">Applied</Chip>}
                        </View>
                      </View>
                      <Button compact onPress={() => toggleSave(job)}>
                        {job.is_saved ? "Saved" : "Save"}
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              </Pressable>
            ))}

            {jobs.length === 0 && (
              <Text style={{ color: colors.inkMuted, textAlign: "center", marginTop: 32 }}>
                No open roles right now.
              </Text>
            )}
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}
