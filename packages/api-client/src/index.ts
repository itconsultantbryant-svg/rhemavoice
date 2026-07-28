import type { AuthTokens, DashboardPayload, ModuleMeta, ThemePreference, User } from "@rhemavoice/shared";

export type TokenStore = {
  getAccessToken: () => string | null | Promise<string | null>;
  getRefreshToken: () => string | null | Promise<string | null>;
  setTokens: (tokens: AuthTokens) => void | Promise<void>;
  clearTokens: () => void | Promise<void>;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function formatApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.detail === "string") return obj.detail;
  if (typeof obj.message === "string") return obj.message;
  if (Array.isArray(obj.detail)) {
    return obj.detail
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join(" ");
  }
  const fieldErrors = Object.entries(obj)
    .filter(([key]) => key !== "detail" && key !== "message")
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) return value.map((v) => `${key}: ${v}`);
      if (typeof value === "string") return [`${key}: ${value}`];
      return [];
    });
  if (fieldErrors.length) return fieldErrors.join(" ");
  return fallback;
}

export function createApiClient(baseUrl: string, tokenStore: TokenStore) {
  const url = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    if (auth) {
      const token = await tokenStore.getAccessToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }

    let res = await fetch(`${url}${path}`, { ...options, headers });

    if (res.status === 401 && auth) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        headers.set("Authorization", `Bearer ${refreshed.access}`);
        res = await fetch(`${url}${path}`, { ...options, headers });
      }
    }

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text || null;
    }
    if (!res.ok) {
      throw new ApiError(formatApiError(data, res.statusText), res.status, data);
    }
    return data as T;
  }

  async function refreshTokens(): Promise<AuthTokens | null> {
    const refresh = await tokenStore.getRefreshToken();
    if (!refresh) return null;
    try {
      const tokens = await request<AuthTokens>(
        "/auth/token/refresh/",
        { method: "POST", body: JSON.stringify({ refresh }) },
        false
      );
      await tokenStore.setTokens(tokens);
      return tokens;
    } catch {
      await tokenStore.clearTokens();
      return null;
    }
  }

  return {
    request,
    auth: {
      login: (email: string, password: string) =>
        request<{ otp_required: boolean; challenge_id: string; message: string }>(
          "/auth/login/",
          { method: "POST", body: JSON.stringify({ email, password }) },
          false
        ),
      verifyOtp: async (challenge_id: string, code: string) => {
        const result = await request<{ user: User; tokens: AuthTokens }>(
          "/auth/otp/verify/",
          { method: "POST", body: JSON.stringify({ challenge_id, code }) },
          false
        );
        await tokenStore.setTokens(result.tokens);
        return result;
      },
      register: (payload: {
        email: string;
        password: string;
        first_name: string;
        last_name: string;
        phone?: string;
      }) =>
        request<{ otp_required: boolean; challenge_id: string; message: string }>(
          "/auth/register/",
          { method: "POST", body: JSON.stringify(payload) },
          false
        ),
      me: () => request<User>("/auth/me/"),
      updateTheme: (theme_preference: ThemePreference) =>
        request<User>("/auth/me/", {
          method: "PATCH",
          body: JSON.stringify({ theme_preference }),
        }),
      updateProfile: (payload: {
        first_name?: string;
        last_name?: string;
        display_name?: string;
        phone?: string;
        avatar_url?: string;
      }) =>
        request<User>("/auth/me/", {
          method: "PATCH",
          body: JSON.stringify(payload),
        }),
      logout: async () => {
        const refresh = await tokenStore.getRefreshToken();
        if (refresh) {
          try {
            await request("/auth/logout/", { method: "POST", body: JSON.stringify({ refresh }) });
          } catch {
            /* ignore */
          }
        }
        await tokenStore.clearTokens();
      },
    },
    modules: {
      list: () => request<ModuleMeta[]>("/modules/"),
      getProfile: (moduleId: string) => request<Record<string, unknown>>(`/modules/${moduleId}/profile/`),
      saveProfile: (moduleId: string, data: Record<string, unknown>) =>
        request<Record<string, unknown>>(`/modules/${moduleId}/profile/`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
    },
    dashboard: {
      get: () => request<DashboardPayload>("/dashboard/"),
    },
    academy: {
      institutions: () =>
        request<
          Array<{ id: string; code: string; name: string; tagline: string; description: string; logo_key: string }>
        >("/academy/institutions/"),
      courses: () => request<Array<Record<string, unknown>>>("/academy/courses/"),
      course: (id: string) => request<Record<string, unknown>>(`/academy/courses/${id}/`),
      enroll: (id: string) => request<Record<string, unknown>>(`/academy/courses/${id}/enroll/`, { method: "POST" }),
      progress: (id: string, progress: number) =>
        request<Record<string, unknown>>(`/academy/courses/${id}/progress/`, {
          method: "POST",
          body: JSON.stringify({ progress }),
        }),
      me: () =>
        request<{
          enrollments: Array<Record<string, unknown>>;
          certificates: Array<Record<string, unknown>>;
          categories: Array<{ id: string; name: string; slug: string }>;
        }>("/academy/me/"),
    },
    streaming: {
      list: (status?: string) =>
        request<Array<Record<string, unknown>>>(`/streaming/${status ? `?status=${status}` : ""}`),
      get: (id: string) => request<Record<string, unknown>>(`/streaming/${id}/`),
      chat: (id: string, message: string) =>
        request(`/streaming/${id}/chat/`, { method: "POST", body: JSON.stringify({ message }) }),
      pray: (id: string, title: string, body?: string) =>
        request(`/streaming/${id}/pray/`, {
          method: "POST",
          body: JSON.stringify({ title, body: body || "" }),
        }),
    },
    rooms: {
      list: () => request<Array<Record<string, unknown>>>("/rooms/"),
      get: (id: string) => request<Record<string, unknown>>(`/rooms/${id}/`),
      join: (id: string) => request(`/rooms/${id}/join/`, { method: "POST" }),
      leave: (id: string) => request(`/rooms/${id}/leave/`, { method: "POST" }),
      raiseHand: (id: string) => request(`/rooms/${id}/raise_hand/`, { method: "POST" }),
      mute: (id: string, muted?: boolean) =>
        request(`/rooms/${id}/mute/`, { method: "POST", body: JSON.stringify({ muted }) }),
      chat: (id: string, message: string) =>
        request(`/rooms/${id}/chat/`, { method: "POST", body: JSON.stringify({ message }) }),
      messages: (id: string) => request<Array<Record<string, unknown>>>(`/rooms/${id}/messages/`),
    },
    radio: {
      stations: () => request<Array<Record<string, unknown>>>("/radio/stations/"),
      favorite: (id: string) => request(`/radio/stations/${id}/favorite/`, { method: "POST" }),
      podcasts: () => request<Array<Record<string, unknown>>>("/radio/stations/podcasts/"),
    },
    music: {
      tracks: () => request<Array<Record<string, unknown>>>("/music/tracks/"),
      play: (id: string) => request(`/music/tracks/${id}/play/`, { method: "POST" }),
      favorite: (id: string) => request(`/music/tracks/${id}/favorite/`, { method: "POST" }),
      artists: () => request<Array<Record<string, unknown>>>("/music/artists/"),
      albums: () => request<Array<Record<string, unknown>>>("/music/albums/"),
      playlists: () => request<Array<Record<string, unknown>>>("/music/playlists/"),
    },
    business: {
      list: () => request<Array<Record<string, unknown>>>("/business/"),
      get: (id: string) => request<Record<string, unknown>>(`/business/${id}/`),
      favorite: (id: string) => request(`/business/${id}/favorite/`, { method: "POST" }),
      review: (id: string, rating: number, comment?: string) =>
        request(`/business/${id}/review/`, {
          method: "POST",
          body: JSON.stringify({ rating, comment: comment || "" }),
        }),
      categories: () => request<Array<Record<string, unknown>>>("/business/categories/"),
    },
    learn: {
      areas: () => request<Array<Record<string, unknown>>>("/learn/areas/"),
      lessons: () => request<Array<Record<string, unknown>>>("/learn/lessons/"),
      sessions: (status?: string) =>
        request<Array<Record<string, unknown>>>(`/learn/sessions/${status ? `?status=${status}` : ""}`),
    },
    opportunities: {
      list: (type?: string) =>
        request<Array<Record<string, unknown>>>(`/opportunities/${type ? `?type=${type}` : ""}`),
      get: (id: string) => request<Record<string, unknown>>(`/opportunities/${id}/`),
      save: (id: string) =>
        request<{ saved: boolean }>(`/opportunities/${id}/save_opportunity/`, { method: "POST" }),
      apply: (id: string, cover_note?: string) =>
        request(`/opportunities/${id}/apply/`, {
          method: "POST",
          body: JSON.stringify({ cover_note: cover_note || "" }),
        }),
      me: () =>
        request<{ applications: Array<Record<string, unknown>>; saved: Array<Record<string, unknown>> }>(
          "/opportunities/me/"
        ),
    },
    transport: {
      providers: (city?: string) =>
        request<Array<Record<string, unknown>>>(`/transport/providers/${city ? `?city=${city}` : ""}`),
      book: (id: string, payload: { pickup_location: string; destination: string; service_type?: string; notes?: string }) =>
        request<Record<string, unknown>>(`/transport/providers/${id}/book/`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      bookings: () => request<Array<Record<string, unknown>>>("/transport/bookings/"),
    },
    ticketing: {
      events: (category?: string) =>
        request<Array<Record<string, unknown>>>(`/ticketing/events/${category ? `?category=${category}` : ""}`),
      event: (id: string) => request<Record<string, unknown>>(`/ticketing/events/${id}/`),
      purchase: (id: string, tier_id: string, quantity = 1) =>
        request<Record<string, unknown>>(`/ticketing/events/${id}/purchase/`, {
          method: "POST",
          body: JSON.stringify({ tier_id, quantity }),
        }),
      myTickets: () => request<Array<Record<string, unknown>>>("/ticketing/my-tickets/"),
    },
    air: {
      agencies: () => request<Array<Record<string, unknown>>>("/air/agencies/"),
      flights: (departure?: string, arrival?: string) => {
        const params = new URLSearchParams();
        if (departure) params.set("departure", departure);
        if (arrival) params.set("arrival", arrival);
        const q = params.toString();
        return request<Array<Record<string, unknown>>>(`/air/flights/${q ? `?${q}` : ""}`);
      },
      book: (id: string, payload: { passengers?: number; passenger_name?: string }) =>
        request<Record<string, unknown>>(`/air/flights/${id}/book/`, {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      bookings: () => request<Array<Record<string, unknown>>>("/air/bookings/"),
    },
    jobs: {
      list: () => request<Array<Record<string, unknown>>>("/jobs/postings/"),
      get: (id: string) => request<Record<string, unknown>>(`/jobs/postings/${id}/`),
      save: (id: string) => request<{ saved: boolean }>(`/jobs/postings/${id}/save_job/`, { method: "POST" }),
      apply: (id: string, cover_note?: string) =>
        request(`/jobs/postings/${id}/apply/`, {
          method: "POST",
          body: JSON.stringify({ cover_note: cover_note || "" }),
        }),
      me: () =>
        request<{ applications: Array<Record<string, unknown>>; saved: Array<Record<string, unknown>> }>("/jobs/me/"),
    },
    marketplace: {
      products: () => request<Array<Record<string, unknown>>>("/marketplace/products/"),
      product: (id: string) => request<Record<string, unknown>>(`/marketplace/products/${id}/`),
      wishlist: (id: string) =>
        request<{ wishlisted: boolean }>(`/marketplace/products/${id}/wishlist/`, { method: "POST" }),
      cart: () =>
        request<{ items: Array<Record<string, unknown>>; total_cents: number }>("/marketplace/cart/"),
      addToCart: (product_id: string, quantity = 1) =>
        request("/marketplace/cart/", { method: "POST", body: JSON.stringify({ product_id, quantity }) }),
      removeFromCart: (item_id: string) =>
        request("/marketplace/cart/", { method: "DELETE", body: JSON.stringify({ item_id }) }),
      checkout: (source = "marketplace") =>
        request<Record<string, unknown>>("/marketplace/checkout/", {
          method: "POST",
          body: JSON.stringify({ source }),
        }),
      orders: () => request<Array<Record<string, unknown>>>("/marketplace/orders/"),
    },
    store: {
      products: (category?: string) =>
        request<Array<Record<string, unknown>>>(`/store/products/${category ? `?category=${category}` : ""}`),
    },
    chat: {
      conversations: () => request<Array<Record<string, unknown>>>("/chat/"),
      create: (payload: { title?: string; participant_ids?: string[]; is_group?: boolean }) =>
        request<Record<string, unknown>>("/chat/", { method: "POST", body: JSON.stringify(payload) }),
      messages: (id: string) => request<Array<Record<string, unknown>>>(`/chat/${id}/messages/`),
      send: (id: string, body: string) =>
        request<Record<string, unknown>>(`/chat/${id}/messages/`, {
          method: "POST",
          body: JSON.stringify({ body }),
        }),
    },
    notifications: {
      list: (unread?: boolean) =>
        request<{ results?: Array<Record<string, unknown>>; unread_count: number } | Array<Record<string, unknown>>>(
          `/notifications/${unread ? "?unread=true" : ""}`
        ),
      read: (id: string) => request(`/notifications/${id}/read/`, { method: "POST" }),
      readAll: () => request("/notifications/read_all/", { method: "POST" }),
    },
    wallet: {
      get: () => request<Record<string, unknown>>("/wallet/"),
      transactions: () => request<Array<Record<string, unknown>>>("/wallet/transactions/"),
      topup: (amount_cents: number, description?: string) =>
        request<Record<string, unknown>>("/wallet/topup/", {
          method: "POST",
          body: JSON.stringify({ amount_cents, description }),
        }),
      give: (amount_cents: number, description?: string) =>
        request<Record<string, unknown>>("/wallet/give/", {
          method: "POST",
          body: JSON.stringify({ amount_cents, description }),
        }),
    },
    payments: {
      providers: () =>
        request<Array<{ id: string; key: string; name: string; supports_currency: string }>>("/payments/providers/"),
      initiate: (payload: { amount_cents: number; provider?: string; purpose?: string; currency?: string }) =>
        request<Record<string, unknown>>("/payments/initiate/", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      confirm: (reference: string) =>
        request<Record<string, unknown>>("/payments/confirm/", {
          method: "POST",
          body: JSON.stringify({ reference }),
        }),
      history: () => request<Array<Record<string, unknown>>>("/payments/"),
    },
    church: {
      list: () => request<Array<Record<string, unknown>>>("/church/"),
      get: (id: string) => request<Record<string, unknown>>(`/church/${id}/`),
      join: (id: string, role?: string) =>
        request(`/church/${id}/join/`, { method: "POST", body: JSON.stringify({ role: role || "member" }) }),
      leave: (id: string) => request(`/church/${id}/leave/`, { method: "POST" }),
      mine: () => request<Array<Record<string, unknown>>>("/church/mine/"),
    },
    settings: {
      preferences: () => request<Record<string, unknown>>("/settings/preferences/"),
      updatePreferences: (payload: Record<string, unknown>) =>
        request<Record<string, unknown>>("/settings/preferences/", {
          method: "PUT",
          body: JSON.stringify(payload),
        }),
    },
    analytics: {
      overview: () =>
        request<{
          cards: Array<{ key: string; label: string; value: number; module: string }>;
          engagement_series: Array<{ label: string; value: number; captured_for: string }>;
          module_breakdown: Array<{ module: string; value: number }>;
        }>("/analytics/overview/"),
      snapshots: (module?: string) =>
        request<Array<Record<string, unknown>>>(`/analytics/snapshots/${module ? `?module=${module}` : ""}`),
    },
    admin: {
      users: () => request<User[]>("/admin/users/"),
      updateUser: (id: string, payload: { is_active?: boolean; role_codes?: string[] }) =>
        request<User>(`/admin/users/${id}/`, { method: "PATCH", body: JSON.stringify(payload) }),
      roles: () => request<Array<{ id: string; name: string; code?: string; permissions: string[] }>>("/admin/roles/"),
      toggles: () => request<Array<{ key: string; enabled: boolean; label: string }>>("/admin/feature-toggles/"),
      setToggle: (key: string, enabled: boolean) =>
        request(`/admin/feature-toggles/${key}/`, {
          method: "PATCH",
          body: JSON.stringify({ enabled }),
        }),
      auditLogs: () =>
        request<Array<{ id: string; action: string; actor: string; created_at: string }>>("/admin/audit-logs/"),
      settings: () => request<Array<{ key: string; value: unknown }>>("/admin/settings/"),
      updateSetting: (key: string, value: unknown) =>
        request("/admin/settings/", { method: "PUT", body: JSON.stringify({ key, value }) }),
      jobs: () => request<Array<Record<string, unknown>>>("/admin/jobs/"),
      jobAction: (id: string, action: "approve" | "reject") =>
        request(`/admin/jobs/${id}/`, { method: "POST", body: JSON.stringify({ action }) }),
      applications: () => request<Array<Record<string, unknown>>>("/admin/applications/"),
      updateApplication: (id: string, statusValue: string) =>
        request("/admin/applications/", { method: "PATCH", body: JSON.stringify({ id, status: statusValue }) }),
      orders: () => request<Array<Record<string, unknown>>>("/admin/orders/"),
      orderAction: (id: string, action: "fulfill" | "cancel" | "refund") =>
        request(`/admin/orders/${id}/`, { method: "POST", body: JSON.stringify({ action }) }),
      chat: () => request<Array<Record<string, unknown>>>("/admin/chat/"),
      deleteMessage: (id: string) => request(`/admin/chat/messages/${id}/`, { method: "DELETE" }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function wsUrl(baseHttpUrl: string, path: string, token?: string | null) {
  const http = baseHttpUrl.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
  const ws = http.replace(/^http/, "ws");
  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${ws}${path.startsWith("/") ? path : `/${path}`}${q}`;
}
