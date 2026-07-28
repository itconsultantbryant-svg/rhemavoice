import { router } from "expo-router";
import { useState } from "react";
import { Image, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button, Text, TextInput } from "react-native-paper";
import { api } from "../lib/api";
import { colors } from "../theme";

export default function Login() {
  const [email, setEmail] = useState("demo@rhemavoice.app");
  const [password, setPassword] = useState("Demo123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await api.auth.login(email, password);
      router.push({ pathname: "/otp", params: { challenge: res.challenge_id } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, padding: 24, justifyContent: "center" }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Image
          source={require("../assets/brand/rhemavoice_logo.jpeg")}
          style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 12 }}
        />
        <Text style={{ color: colors.gold500, letterSpacing: 3, textTransform: "uppercase", fontSize: 12 }}>Sign in</Text>
        <Text variant="headlineMedium" style={{ color: colors.navy900, marginTop: 8, fontWeight: "700" }}>
          Welcome back
        </Text>
        <TextInput mode="outlined" label="Email" value={email} onChangeText={setEmail} style={{ marginTop: 20 }} autoCapitalize="none" />
        <TextInput mode="outlined" label="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ marginTop: 12 }} />
        {!!error && <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>}
        <Button mode="contained" onPress={submit} loading={busy} style={{ marginTop: 20, backgroundColor: colors.navy900 }}>
          Continue
        </Button>
        <Text style={{ marginTop: 16, color: colors.inkMuted, textAlign: "center" }}>Dev OTP: 123456</Text>
      </Animated.View>
    </View>
  );
}
