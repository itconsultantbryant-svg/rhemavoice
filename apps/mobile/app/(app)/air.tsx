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

type Flight = {
  id: string;
  airline: string;
  flight_number: string;
  departure_city: string;
  arrival_city: string;
  cabin_class: string;
  stops: number;
  price_cents: number;
  currency: string;
  agency_name: string;
};

export default function AirScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [departure, setDeparture] = useState("");
  const [arrival, setArrival] = useState("");
  const [selected, setSelected] = useState<Flight | null>(null);
  const [passengerName, setPassengerName] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [booked, setBooked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load(dep?: string, arr?: string) {
    setLoading(true);
    setError("");
    api.air
      .flights(dep || undefined, arr || undefined)
      .then((data: any) => { setFlights(data); setSelected(null); setBooked(false); })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.replace("/welcome"); return; }
    load();
  }, [user]);

  function search() {
    load(departure.trim(), arrival.trim());
  }

  async function book() {
    if (!selected || !passengerName.trim()) return;
    setBusy(true);
    try {
      await api.air.book(selected.id, { passengers: Number(passengers) || 1, passenger_name: passengerName.trim() });
      setBooked(true);
    } finally {
      setBusy(false);
    }
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={() => load()} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => selected ? setSelected(null) : router.back()} style={{ alignSelf: "flex-start" }}>
          {selected ? "Back to flights" : "Back"}
        </Button>

        {selected ? (
          <View style={{ marginTop: 12 }}>
            <Text variant="headlineSmall" style={{ fontWeight: "700" }}>
              {selected.departure_city} → {selected.arrival_city}
            </Text>
            <Text style={{ color: colors.gold500, marginTop: 4 }}>{selected.airline} · {selected.flight_number}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <Chip compact>{selected.cabin_class}</Chip>
              <Chip compact>{selected.stops === 0 ? "Direct" : `${selected.stops} stop${selected.stops > 1 ? "s" : ""}`}</Chip>
              <Chip compact icon="tag">${(selected.price_cents / 100).toFixed(0)}</Chip>
            </View>
            <Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 8 }}>via {selected.agency_name}</Text>

            {booked ? (
              <Card style={{ marginTop: 20, backgroundColor: "rgba(34,197,94,0.1)" }}>
                <Card.Content style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Avatar.Icon size={48} icon="airplane-check" color="#22c55e" style={{ backgroundColor: "transparent" }} />
                  <Text variant="titleMedium" style={{ marginTop: 8, fontWeight: "700" }}>Booking Confirmed!</Text>
                  <Text style={{ color: colors.inkMuted, marginTop: 4 }}>Your e-ticket will be delivered shortly.</Text>
                  <Button mode="outlined" onPress={() => { setSelected(null); setBooked(false); }} style={{ marginTop: 12 }}>
                    Search more flights
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <>
                <Text variant="titleMedium" style={{ marginTop: 20, fontWeight: "700" }}>Book this flight</Text>
                <TextInput mode="outlined" label="Passenger name" value={passengerName} onChangeText={setPassengerName} style={{ marginTop: 10 }} />
                <TextInput mode="outlined" label="Number of passengers" value={passengers} onChangeText={setPassengers} keyboardType="numeric" style={{ marginTop: 10 }} />
                <Button mode="contained" onPress={book} loading={busy} disabled={busy || !passengerName.trim()} style={{ marginTop: 16, backgroundColor: colors.gold500 }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>
                  Book Flight
                </Button>
              </>
            )}
          </View>
        ) : (
          <>
            <Text variant="titleLarge" style={{ marginTop: 12, fontWeight: "700" }}>RhemaAir</Text>
            <Text style={{ color: colors.inkMuted, marginTop: 4 }}>Search and book flights through approved travel agencies</Text>

            <Card style={{ marginTop: 16, backgroundColor: colors.elevated }}>
              <Card.Content>
                <TextInput mode="outlined" label="From (city)" value={departure} onChangeText={setDeparture} style={{ marginTop: 4 }} dense />
                <TextInput mode="outlined" label="To (city)" value={arrival} onChangeText={setArrival} style={{ marginTop: 8 }} dense />
                <Button mode="contained" onPress={search} style={{ marginTop: 12, backgroundColor: colors.gold500 }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>
                  Search Flights
                </Button>
              </Card.Content>
            </Card>

            {flights.length > 0 && (
              <Text variant="titleMedium" style={{ marginTop: 20, fontWeight: "700" }}>
                {flights.length} flight{flights.length !== 1 ? "s" : ""} found
              </Text>
            )}
            {flights.map((f) => (
              <Pressable key={f.id} onPress={() => setSelected(f)}>
                <Card style={{ marginTop: 8, backgroundColor: colors.elevated }}>
                  <Card.Content>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "700" }}>{f.departure_city} → {f.arrival_city}</Text>
                        <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{f.airline} · {f.cabin_class}</Text>
                        <Text style={{ color: colors.inkMuted, fontSize: 11 }}>{f.agency_name}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontWeight: "700", color: colors.gold500 }}>${(f.price_cents / 100).toFixed(0)}</Text>
                        <Text style={{ color: colors.inkMuted, fontSize: 11 }}>
                          {f.stops === 0 ? "Direct" : `${f.stops} stop`}
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
