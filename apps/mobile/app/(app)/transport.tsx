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

type Provider = {
  id: string;
  name: string;
  description: string;
  city: string;
  country: string;
  services: string;
  rating_avg: number;
  is_verified: boolean;
};

export default function TransportScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selected, setSelected] = useState<Provider | null>(null);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [booked, setBooked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api.transport
      .providers()
      .then((data: any) => { setProviders(data); setSelected(null); setBooked(false); })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.replace("/welcome"); return; }
    load();
  }, [user]);

  async function book() {
    if (!selected || !pickup.trim() || !destination.trim()) return;
    setBusy(true);
    try {
      await api.transport.book(selected.id, { pickup_location: pickup, destination, service_type: serviceType || "standard", notes });
      setBooked(true);
      setPickup("");
      setDestination("");
      setServiceType("");
      setNotes("");
    } finally {
      setBusy(false);
    }
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => selected ? setSelected(null) : router.back()} style={{ alignSelf: "flex-start" }}>
          {selected ? "Back to providers" : "Back"}
        </Button>

        {selected ? (
          <View style={{ marginTop: 12 }}>
            <Text variant="headlineSmall" style={{ fontWeight: "700" }}>{selected.name}</Text>
            <Text style={{ color: colors.inkMuted, marginTop: 4 }}>{selected.description}</Text>
            <Text style={{ color: colors.gold500, fontSize: 12, marginTop: 4 }}>
              ★ {selected.rating_avg.toFixed(1)} · {selected.city}, {selected.country}
            </Text>

            {booked ? (
              <Card style={{ marginTop: 20, backgroundColor: "rgba(34,197,94,0.1)" }}>
                <Card.Content style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Avatar.Icon size={48} icon="check-circle" color="#22c55e" style={{ backgroundColor: "transparent" }} />
                  <Text variant="titleMedium" style={{ marginTop: 8, fontWeight: "700" }}>Booking Submitted</Text>
                  <Text style={{ color: colors.inkMuted, marginTop: 4, textAlign: "center" }}>
                    The provider will contact you to confirm.
                  </Text>
                  <Button mode="outlined" onPress={() => { setSelected(null); setBooked(false); }} style={{ marginTop: 12 }}>
                    Browse more
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <>
                <Text variant="titleMedium" style={{ marginTop: 20, fontWeight: "700" }}>Book a Ride</Text>
                <TextInput mode="outlined" label="Pickup location" value={pickup} onChangeText={setPickup} style={{ marginTop: 10 }} />
                <TextInput mode="outlined" label="Destination" value={destination} onChangeText={setDestination} style={{ marginTop: 10 }} />
                <TextInput mode="outlined" label="Service type (e.g. airport transfer, taxi)" value={serviceType} onChangeText={setServiceType} style={{ marginTop: 10 }} />
                <TextInput mode="outlined" label="Notes (optional)" value={notes} onChangeText={setNotes} multiline style={{ marginTop: 10 }} />
                <Button mode="contained" onPress={book} loading={busy} disabled={busy || !pickup.trim() || !destination.trim()} style={{ marginTop: 16, backgroundColor: colors.navy900 }}>
                  Request Booking
                </Button>
              </>
            )}
          </View>
        ) : (
          <>
            <Text variant="titleLarge" style={{ marginTop: 12, fontWeight: "700" }}>Transportation</Text>
            <Text style={{ color: colors.inkMuted, marginTop: 4 }}>Book rides with approved providers across Liberia</Text>
            {providers.map((p) => (
              <Pressable key={p.id} onPress={() => setSelected(p)}>
                <Card style={{ marginTop: 10, backgroundColor: colors.elevated }}>
                  <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Avatar.Icon size={40} icon="car" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontWeight: "700" }}>{p.name}</Text>
                        {p.is_verified && <Chip compact>Verified</Chip>}
                      </View>
                      <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{p.services}</Text>
                      <Text style={{ color: colors.gold500, fontSize: 12 }}>★ {p.rating_avg.toFixed(1)} · {p.city}</Text>
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
