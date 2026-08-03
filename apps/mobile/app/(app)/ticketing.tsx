import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, Chip, Text } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";

type Tier = { id: string; name: string; price_cents: number; quantity_available: number };
type EventItem = {
  id: string;
  title: string;
  organizer: string;
  description: string;
  venue: string;
  city: string;
  starts_at: string;
  category: string;
  tiers: Tier[];
};

export default function TicketingScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [active, setActive] = useState<EventItem | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.ticketing
      .events()
      .then((data: any) => { setEvents(data); setActive(null); setPurchased(false); })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.replace("/welcome"); return; }
    load();
  }, [user]);

  async function purchase(tierId: string) {
    if (!active) return;
    setBusy(true);
    try {
      await api.ticketing.purchase(active.id, tierId);
      setPurchased(true);
    } finally {
      setBusy(false);
    }
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => active ? setActive(null) : router.back()} style={{ alignSelf: "flex-start" }}>
          {active ? "Back to events" : "Back"}
        </Button>

        {active ? (
          <View style={{ marginTop: 12 }}>
            <Chip compact style={{ alignSelf: "flex-start" }}>{active.category}</Chip>
            <Text variant="headlineSmall" style={{ fontWeight: "700", marginTop: 8 }}>{active.title}</Text>
            <Text style={{ color: colors.gold500, marginTop: 4 }}>{active.organizer}</Text>
            <Text style={{ color: colors.inkMuted, marginTop: 12 }}>{active.description}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Chip compact icon="map-marker">{active.venue}, {active.city}</Chip>
              <Chip compact icon="calendar">{new Date(active.starts_at).toLocaleDateString()}</Chip>
            </View>

            {purchased ? (
              <Card style={{ marginTop: 20, backgroundColor: "rgba(34,197,94,0.1)" }}>
                <Card.Content style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Avatar.Icon size={48} icon="ticket-confirmation" color="#22c55e" style={{ backgroundColor: "transparent" }} />
                  <Text variant="titleMedium" style={{ marginTop: 8, fontWeight: "700" }}>Ticket Purchased!</Text>
                  <Text style={{ color: colors.inkMuted, marginTop: 4 }}>Your e-ticket has been generated.</Text>
                  <Button mode="outlined" onPress={() => { setActive(null); setPurchased(false); }} style={{ marginTop: 12 }}>
                    Browse more events
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <>
                <Text variant="titleMedium" style={{ marginTop: 20, fontWeight: "700" }}>Tickets</Text>
                {active.tiers.map((t) => (
                  <Card key={t.id} style={{ marginTop: 8, backgroundColor: colors.elevated }}>
                    <Card.Content style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View>
                        <Text style={{ fontWeight: "700" }}>{t.name}</Text>
                        <Text style={{ color: colors.gold500 }}>${(t.price_cents / 100).toFixed(2)}</Text>
                        <Text style={{ color: colors.inkMuted, fontSize: 11 }}>{t.quantity_available} available</Text>
                      </View>
                      <Button mode="contained" onPress={() => purchase(t.id)} loading={busy} disabled={busy || t.quantity_available <= 0} compact style={{ backgroundColor: colors.navy900 }}>
                        Buy
                      </Button>
                    </Card.Content>
                  </Card>
                ))}
              </>
            )}
          </View>
        ) : (
          <>
            <Text variant="titleLarge" style={{ marginTop: 12, fontWeight: "700" }}>Events & Tickets</Text>
            <Text style={{ color: colors.inkMuted, marginTop: 4 }}>Discover events and purchase tickets</Text>
            {events.map((e) => (
              <Pressable key={e.id} onPress={() => setActive(e)}>
                <Card style={{ marginTop: 10, backgroundColor: colors.elevated }}>
                  <Card.Content>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700" }}>{e.title}</Text>
                        <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{e.organizer}</Text>
                        <Text style={{ color: colors.inkMuted, fontSize: 11 }}>{e.venue}, {e.city}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Chip compact>{e.category}</Chip>
                        <Text style={{ color: colors.gold500, fontSize: 11, marginTop: 4 }}>
                          {new Date(e.starts_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </Pressable>
            ))}
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}
