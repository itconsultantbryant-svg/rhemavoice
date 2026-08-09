import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../theme";

type GlyphName = keyof typeof MaterialCommunityIcons.glyphMap;

const TAB_ICONS: Record<string, { active: GlyphName; inactive: GlyphName }> = {
  home: { active: "home-variant", inactive: "home-variant-outline" },
  explore: { active: "compass", inactive: "compass-outline" },
  rooms: { active: "microphone", inactive: "microphone-outline" },
  alerts: { active: "bell", inactive: "bell-outline" },
  profile: { active: "account", inactive: "account-outline" },
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.purple950,
        borderTopWidth: 1,
        borderTopColor: "rgba(197, 160, 72, 0.25)",
        height: 58 + insets.bottom,
        paddingBottom: Math.max(insets.bottom, 8),
        paddingTop: 6,
      },
      tabBarActiveTintColor: colors.gold300,
      tabBarInactiveTintColor: colors.inkMuted,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: "700" as const,
        letterSpacing: 0.3,
      },
      sceneStyle: { backgroundColor: colors.surface },
    }),
    [insets.bottom]
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? TAB_ICONS.home.active : TAB_ICONS.home.inactive}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? TAB_ICONS.explore.active : TAB_ICONS.explore.inactive}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: "Rooms",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? TAB_ICONS.rooms.active : TAB_ICONS.rooms.inactive}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? TAB_ICONS.alerts.active : TAB_ICONS.alerts.inactive}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? TAB_ICONS.profile.active : TAB_ICONS.profile.inactive}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
