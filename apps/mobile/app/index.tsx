import { Redirect } from "expo-router";
import { ActivityIndicator, Image, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Text } from "react-native-paper";
import { brand, colors } from "../theme";
import { useAppSelector } from "../store";

export default function SplashScreen() {
  const { user, hydrated } = useAppSelector((s) => s.auth);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.purple950 }}>
        <Image
          source={require("../assets/brand/loading_cover.jpeg")}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          resizeMode="cover"
        />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 64 }}>
          <Animated.View entering={FadeIn.duration(280)} style={{ alignItems: "center" }}>
            <Text style={{ color: colors.gold300, letterSpacing: 2, fontSize: 12 }}>{brand.tagline}</Text>
            <ActivityIndicator color={colors.gold500} style={{ marginTop: 16 }} />
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 20, fontSize: 12 }}>{brand.footer}</Text>
          </Animated.View>
        </View>
      </View>
    );
  }

  if (user) return <Redirect href="/(app)/dashboard" />;
  return <Redirect href="/welcome" />;
}
