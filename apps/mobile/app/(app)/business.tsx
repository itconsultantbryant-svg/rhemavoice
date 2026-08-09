import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, Chip, IconButton, Text, TextInput } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";
import { ModuleShell } from "../../components/ModuleShell";

type Product = { id: string; title: string; price_cents: number; is_service: boolean };
type BusinessItem = {
  id: string;
  name: string;
  category_name: string;
  description: string;
  city: string;
  country: string;
  verified: boolean;
  featured: boolean;
  rating_avg: number;
  review_count: number;
  is_favorite: boolean;
  products?: Product[];
};

export default function BusinessScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [active, setActive] = useState<BusinessItem | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.business
      .list()
      .then((data: any) => { setBusinesses(data); setActive(null); })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.replace("/welcome"); return; }
    load();
  }, [user]);

  async function toggleFavorite(id: string) {
    await api.business.favorite(id);
    setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, is_favorite: !b.is_favorite } : b)));
    if (active?.id === id) setActive((a) => a && { ...a, is_favorite: !a.is_favorite });
  }

  async function submitReview() {
    if (!active || !comment.trim()) return;
    await api.business.review(active.id, rating, comment.trim());
    setComment("");
    setRating(5);
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ModuleShell moduleId="business">
      <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Animated.View entering={FadeInUp.duration(280)}>
          <Button onPress={() => active ? setActive(null) : router.back()} style={{ alignSelf: "flex-start" }}>
            {active ? "Back to list" : "Back"}
          </Button>

          {active ? (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text variant="headlineSmall" style={{ fontWeight: "700", flex: 1 }}>{active.name}</Text>
                <IconButton icon={active.is_favorite ? "heart" : "heart-outline"} iconColor={colors.gold500} onPress={() => toggleFavorite(active.id)} />
              </View>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                {active.verified && <Chip compact icon="check-circle">Verified</Chip>}
                {active.featured && <Chip compact icon="star">Featured</Chip>}
                <Chip compact>{active.category_name}</Chip>
              </View>
              <Text style={{ marginTop: 12, color: colors.inkMuted }}>{active.description}</Text>
              <Text style={{ marginTop: 8, color: colors.gold500 }}>
                ★ {active.rating_avg.toFixed(1)} · {active.review_count} reviews · {active.city}, {active.country}
              </Text>

              {active.products && active.products.length > 0 && (
                <>
                  <Text variant="titleMedium" style={{ marginTop: 20, fontWeight: "700" }}>Products & Services</Text>
                  {active.products.map((p) => (
                    <Card key={p.id} style={{ marginTop: 8, backgroundColor: colors.elevated }}>
                      <Card.Content style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontWeight: "600" }}>{p.title}</Text>
                        <Text style={{ color: colors.gold500 }}>{p.is_service ? "Service" : `$${(p.price_cents / 100).toFixed(2)}`}</Text>
                      </Card.Content>
                    </Card>
                  ))}
                </>
              )}

              <Text variant="titleMedium" style={{ marginTop: 20, fontWeight: "700" }}>Write a Review</Text>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setRating(n)}>
                    <Text style={{ fontSize: 24, color: n <= rating ? colors.gold500 : colors.inkMuted }}>★</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput mode="outlined" placeholder="Your review…" value={comment} onChangeText={setComment} multiline style={{ marginTop: 8 }} />
              <Button mode="contained" onPress={submitReview} style={{ marginTop: 12, backgroundColor: colors.gold500 }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>
                Submit Review
              </Button>
            </View>
          ) : (
            <>
              <Text variant="titleLarge" style={{ marginTop: 12, fontWeight: "700" }}>Business Hub</Text>
              {businesses.map((b) => (
                <Pressable key={b.id} onPress={() => setActive(b)}>
                  <Card style={{ marginTop: 10, backgroundColor: colors.elevated }}>
                    <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Avatar.Icon size={40} icon="briefcase" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontWeight: "700" }}>{b.name}</Text>
                          {b.verified && <Avatar.Icon size={16} icon="check-circle" color={colors.gold500} style={{ backgroundColor: "transparent" }} />}
                        </View>
                        <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{b.category_name} · {b.city}</Text>
                        <Text style={{ color: colors.gold500, fontSize: 12 }}>★ {b.rating_avg.toFixed(1)} ({b.review_count})</Text>
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
