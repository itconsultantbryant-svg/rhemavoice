import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Button, Text, TextInput } from "react-native-paper";
import { api, tokenStore } from "../lib/api";
import { setUser, useAppDispatch } from "../store";
import { colors } from "../theme";

export default function Otp() {
  const { challenge } = useLocalSearchParams<{ challenge: string }>();
  const [code, setCode] = useState("123456");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dispatch = useAppDispatch();

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await api.auth.verifyOtp(String(challenge), code);
      await tokenStore.setTokens(res.tokens);
      dispatch(setUser(res.user));
      router.replace("/(app)/(tabs)");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "OTP failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, padding: 24, justifyContent: "center" }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Text style={{ color: colors.gold500, letterSpacing: 3, textTransform: "uppercase", fontSize: 12 }}>OTP</Text>
        <Text variant="headlineMedium" style={{ color: colors.ink, marginTop: 8, fontWeight: "800" }}>
          Verify your session
        </Text>
        <TextInput mode="outlined" label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" style={{ marginTop: 20, backgroundColor: colors.elevated }} textColor={colors.ink} maxLength={6} />
        {!!error && <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>}
        <Button mode="contained" onPress={submit} loading={busy} style={{ marginTop: 20, backgroundColor: colors.gold500 }} labelStyle={{ color: colors.purple950, fontWeight: "800" }}>
          Enter RhemaVoice
        </Button>
      </Animated.View>
    </View>
  );
}
