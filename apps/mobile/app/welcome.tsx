import { Link } from "expo-router";
import { Image, Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button, Text } from "react-native-paper";
import { brand, colors } from "../theme";

export default function Welcome() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.purple900, padding: 24, justifyContent: "flex-end" }}>
      <Image
        source={require("../assets/brand/loading_cover.jpeg")}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.45 }}
        resizeMode="cover"
      />
      <Animated.View entering={FadeInDown.duration(280)}>
        <Image
          source={require("../assets/brand/rhemavoice_logo.jpeg")}
          style={{ width: 88, height: 88, borderRadius: 44, marginBottom: 16 }}
        />
        <Text style={{ color: colors.gold500, letterSpacing: 4, textTransform: "uppercase", fontSize: 12 }}>
          RhemaVoice
        </Text>
        <Text variant="displaySmall" style={{ color: colors.gold200, marginTop: 12, fontWeight: "700" }}>
          {brand.tagline}
        </Text>
        <Text style={{ color: colors.gold300, marginTop: 12, opacity: 0.9, lineHeight: 22 }}>
          Connect, worship, learn, and grow — streaming, academy, radio, rooms, opportunities, and more.
        </Text>
        <Link href="/login" asChild>
          <Pressable>
            {({ pressed }) => (
              <Button
                mode="contained"
                style={{ marginTop: 28, backgroundColor: colors.gold500, opacity: pressed ? 0.9 : 1 }}
                textColor={colors.purple950}
              >
                Continue
              </Button>
            )}
          </Pressable>
        </Link>
      </Animated.View>
    </View>
  );
}
