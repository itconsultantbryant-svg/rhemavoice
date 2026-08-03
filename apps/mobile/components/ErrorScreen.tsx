import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import { colors } from "../theme";

export function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.surface }}>
      <Text variant="titleMedium" style={{ color: colors.navy900, textAlign: "center" }}>
        Something went wrong
      </Text>
      <Text style={{ marginTop: 8, color: colors.inkMuted, textAlign: "center" }}>{message}</Text>
      <Button mode="contained" onPress={onRetry} style={{ marginTop: 20, backgroundColor: colors.navy900 }}>
        Try again
      </Button>
    </View>
  );
}
