import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { api } from "../lib/api";
import { paperDark, paperLight } from "../paperTheme";
import { Provider, setHydrated, setUser, store, useAppDispatch, useAppSelector } from "../store";

const queryClient = new QueryClient();

function RootNav() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  // Dark-first aesthetic: light only when the user explicitly opts in.
  const dark = user?.theme_preference !== "light";

  useEffect(() => {
    (async () => {
      try {
        const me = await api.auth.me();
        dispatch(setUser(me));
      } catch {
        dispatch(setUser(null));
      } finally {
        dispatch(setHydrated(true));
      }
    })();
  }, [dispatch]);

  const theme = useMemo(() => (dark ? paperDark : paperLight), [dark]);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </PaperProvider>
  );
}

export default function RootLayout() {
  const [client] = useState(() => queryClient);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <RootNav />
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
