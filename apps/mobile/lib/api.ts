import * as SecureStore from "expo-secure-store";
import { createApiClient } from "@rhemavoice/api-client";
import type { AuthTokens } from "@rhemavoice/shared";
import Constants from "expo-constants";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  "http://localhost:8000/api/v1";

const ACCESS = "rv_access";
const REFRESH = "rv_refresh";

export const tokenStore = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH),
  setTokens: async (tokens: AuthTokens) => {
    await SecureStore.setItemAsync(ACCESS, tokens.access);
    await SecureStore.setItemAsync(REFRESH, tokens.refresh);
  },
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS);
    await SecureStore.deleteItemAsync(REFRESH);
  },
};

export const api = createApiClient(API_URL, tokenStore);
