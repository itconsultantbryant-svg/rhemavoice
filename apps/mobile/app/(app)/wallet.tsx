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

type WalletData = { balance_cents: number; currency: string };
type Transaction = { id: string; tx_type: string; amount_cents: number; description: string; reference: string; status: string };
type Provider = { key: string; name: string };

export default function WalletScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [mode, setMode] = useState<"topup" | "give" | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    Promise.all([api.wallet.get(), api.payments.providers()])
      .then(([w, p]: any) => {
        const walletArr = Array.isArray(w) ? w : [w];
        setWallet(walletArr[0] || { balance_cents: 0, currency: "USD" });
        setTransactions(walletArr[0]?.transactions || []);
        setProviders(p);
        if (p.length > 0) setSelectedProvider(p[0].key);
      })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) { router.replace("/welcome"); return; }
    load();
  }, [user]);

  async function topUp() {
    if (!amount.trim()) return;
    setBusy(true);
    try {
      const result = (await api.payments.initiate({
        amount_cents: Math.round(Number(amount) * 100),
        currency: wallet?.currency || "USD",
        provider: selectedProvider,
        purpose: "wallet_topup",
      })) as any;
      if (result?.reference) {
        await api.payments.confirm(result.reference);
      }
      load();
      setMode(null);
      setAmount("");
    } finally {
      setBusy(false);
    }
  }

  async function give() {
    if (!amount.trim()) return;
    setBusy(true);
    try {
      await api.wallet.give(Math.round(Number(amount) * 100), description || "Giving");
      load();
      setMode(null);
      setAmount("");
      setDescription("");
    } finally {
      setBusy(false);
    }
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => mode ? setMode(null) : router.back()} style={{ alignSelf: "flex-start" }}>
          {mode ? "Cancel" : "Back"}
        </Button>

        <Card style={{ marginTop: 12, backgroundColor: colors.navy900, borderRadius: 16 }}>
          <Card.Content style={{ alignItems: "center", paddingVertical: 24 }}>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, textTransform: "uppercase", letterSpacing: 2 }}>Balance</Text>
            <Text variant="displaySmall" style={{ color: "#fff", fontWeight: "700", marginTop: 4 }}>
              ${((wallet?.balance_cents || 0) / 100).toFixed(2)}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 4 }}>{wallet?.currency}</Text>
          </Card.Content>
        </Card>

        {!mode && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Button mode="contained" onPress={() => setMode("topup")} style={{ flex: 1, backgroundColor: colors.gold500 }} labelStyle={{ color: colors.navy900 }}>
              Top Up
            </Button>
            <Button mode="outlined" onPress={() => setMode("give")} style={{ flex: 1 }}>
              Give / Offering
            </Button>
          </View>
        )}

        {mode === "topup" && (
          <Card style={{ marginTop: 16, backgroundColor: colors.elevated }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>Top Up Wallet</Text>
              <TextInput mode="outlined" label="Amount ($)" value={amount} onChangeText={setAmount} keyboardType="numeric" style={{ marginTop: 10 }} />
              <Text style={{ marginTop: 10, fontWeight: "600", fontSize: 13 }}>Payment Provider</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {providers.map((p) => (
                  <Chip key={p.key} selected={selectedProvider === p.key} onPress={() => setSelectedProvider(p.key)}>
                    {p.name}
                  </Chip>
                ))}
              </View>
              <Button mode="contained" onPress={topUp} loading={busy} disabled={busy || !amount.trim()} style={{ marginTop: 16, backgroundColor: colors.navy900 }}>
                Confirm Top Up
              </Button>
            </Card.Content>
          </Card>
        )}

        {mode === "give" && (
          <Card style={{ marginTop: 16, backgroundColor: colors.elevated }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: "700" }}>Give / Offering</Text>
              <TextInput mode="outlined" label="Amount ($)" value={amount} onChangeText={setAmount} keyboardType="numeric" style={{ marginTop: 10 }} />
              <TextInput mode="outlined" label="Description (optional)" value={description} onChangeText={setDescription} style={{ marginTop: 10 }} />
              <Button mode="contained" onPress={give} loading={busy} disabled={busy || !amount.trim()} style={{ marginTop: 16, backgroundColor: colors.navy900 }}>
                Send Offering
              </Button>
            </Card.Content>
          </Card>
        )}

        {!mode && transactions.length > 0 && (
          <>
            <Text variant="titleMedium" style={{ marginTop: 24, fontWeight: "700" }}>Transactions</Text>
            {transactions.map((t) => (
              <Card key={t.id} style={{ marginTop: 8, backgroundColor: colors.elevated }}>
                <Card.Content style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "600" }}>{t.description || t.tx_type}</Text>
                    <Text style={{ color: colors.inkMuted, fontSize: 11 }}>{t.reference}</Text>
                  </View>
                  <Text style={{ fontWeight: "700", color: t.tx_type === "topup" || t.tx_type === "refund" ? "#22c55e" : colors.navy900 }}>
                    {t.tx_type === "topup" || t.tx_type === "refund" ? "+" : "-"}${(t.amount_cents / 100).toFixed(2)}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}
