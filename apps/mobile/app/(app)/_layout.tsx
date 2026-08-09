import { Stack } from "expo-router";

/**
 * App shell: bottom tabs (Home, Explore, Rooms, Alerts, Profile)
 * plus module screens pushed on top of the stack.
 */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#05001E" },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="academy/index" />
      <Stack.Screen name="academy/[code]" />
      <Stack.Screen name="air" />
      <Stack.Screen name="business" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="church" />
      <Stack.Screen name="learn" />
      <Stack.Screen name="module/[id]" />
      <Stack.Screen name="opportunities" />
      <Stack.Screen name="radio" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="streaming" />
      <Stack.Screen name="ticketing" />
      <Stack.Screen name="transport" />
      <Stack.Screen name="wallet" />
    </Stack>
  );
}
