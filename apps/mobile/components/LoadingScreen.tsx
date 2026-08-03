import { ActivityIndicator, View } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "../theme";

export function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}>
      <ActivityIndicator size="large" color={colors.gold500} />
      <Text style={{ marginTop: 12, color: colors.inkMuted }}>Loading…</Text>
    </View>
  );
}
