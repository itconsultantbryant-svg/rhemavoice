import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Avatar, Button, Card, Divider, RadioButton, Switch, Text, TextInput } from "react-native-paper";
import type { ThemePreference } from "@rhemavoice/shared";
import { api, tokenStore } from "../../lib/api";
import { setThemeLocal, setUser, useAppDispatch, useAppSelector } from "../../store";
import { colors } from "../../theme";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "pt", label: "Português" },
  { value: "es", label: "Español" },
  { value: "sw", label: "Kiswahili" },
];

export default function Settings() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [profile, setProfile] = useState({ first_name: "", last_name: "", display_name: "", phone: "" });
  const [prefs, setPrefs] = useState({ notify_email: true, notify_push: true, notify_sms: false, language: "en" });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      display_name: user.display_name || "",
      phone: user.phone || "",
    });
    api.settings.preferences().then((p) => {
      setPrefs({
        notify_email: Boolean(p.notify_email ?? true),
        notify_push: Boolean(p.notify_push ?? true),
        notify_sms: Boolean(p.notify_sms ?? false),
        language: String(p.language || "en"),
      });
    });
  }, [user]);

  if (!user) return null;

  async function chooseTheme(theme: ThemePreference) {
    dispatch(setThemeLocal(theme));
    const updated = await api.auth.updateTheme(theme);
    dispatch(setUser(updated));
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const updated = await api.auth.updateProfile(profile);
      dispatch(setUser(updated));
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePrefs(next: typeof prefs) {
    setPrefs(next);
    await api.settings.updatePreferences(next);
  }

  const initials = (user.display_name || `${user.first_name} ${user.last_name}` || user.email)
    .split(" ")
    .map((s) => s.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const memberSince = user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "—";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
      <Animated.View entering={FadeIn.duration(280)}>
        <Button onPress={() => router.back()} compact style={{ alignSelf: "flex-start" }}>
          ← Back
        </Button>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 }}>
          <Avatar.Text size={56} label={initials || "RV"} color={colors.gold300} style={{ backgroundColor: colors.navy900 }} />
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={{ fontWeight: "700", color: colors.navy900 }}>
              Settings
            </Text>
            <Text style={{ color: colors.inkMuted }}>{user.email}</Text>
          </View>
        </View>

        <Card style={{ marginTop: 20, backgroundColor: colors.elevated }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              Profile
            </Text>
            <TextInput
              mode="outlined"
              label="First name"
              value={profile.first_name}
              onChangeText={(v) => setProfile((p) => ({ ...p, first_name: v }))}
              style={{ marginTop: 10 }}
            />
            <TextInput
              mode="outlined"
              label="Last name"
              value={profile.last_name}
              onChangeText={(v) => setProfile((p) => ({ ...p, last_name: v }))}
              style={{ marginTop: 10 }}
            />
            <TextInput
              mode="outlined"
              label="Display name"
              value={profile.display_name}
              onChangeText={(v) => setProfile((p) => ({ ...p, display_name: v }))}
              style={{ marginTop: 10 }}
            />
            <TextInput
              mode="outlined"
              label="Phone"
              value={profile.phone}
              keyboardType="phone-pad"
              onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
              style={{ marginTop: 10 }}
            />
            <Button
              mode="contained"
              buttonColor={colors.gold500}
              textColor={colors.navy900}
              loading={savingProfile}
              onPress={saveProfile}
              style={{ marginTop: 14 }}
            >
              Save profile
            </Button>
          </Card.Content>
        </Card>

        <Card style={{ marginTop: 12, backgroundColor: colors.elevated }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              Account
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <Text style={{ color: colors.inkMuted }}>Status</Text>
              <Text style={{ color: user.is_active ? colors.gold500 : "#c0392b" }}>
                {user.is_active ? "Active" : "Suspended"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ color: colors.inkMuted }}>Member since</Text>
              <Text>{memberSince}</Text>
            </View>
            <Text style={{ color: colors.inkMuted, marginTop: 8 }}>Roles</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {(user.roles?.length ? user.roles : ["member"]).map((r) => (
                <Text
                  key={r}
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(16,0,48,0.15)",
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    fontSize: 12,
                    textTransform: "capitalize",
                  }}
                >
                  {String(r).replace(/_/g, " ")}
                </Text>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={{ marginTop: 12, backgroundColor: colors.elevated }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              Appearance
            </Text>
            <Text style={{ color: colors.inkMuted, marginTop: 4 }}>Follow system or lock light/dark.</Text>
            <RadioButton.Group onValueChange={(v) => chooseTheme(v as ThemePreference)} value={user.theme_preference}>
              {THEME_OPTIONS.map((opt) => (
                <View key={opt.value} style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  <RadioButton value={opt.value} color={colors.gold500} />
                  <Text>{opt.label} Mode</Text>
                </View>
              ))}
            </RadioButton.Group>
          </Card.Content>
        </Card>

        <Card style={{ marginTop: 12, backgroundColor: colors.elevated }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              Notifications
            </Text>
            {(
              [
                ["notify_email", "Email alerts"],
                ["notify_push", "Push notifications"],
                ["notify_sms", "SMS alerts"],
              ] as const
            ).map(([key, label], idx) => (
              <View key={key}>
                {idx > 0 && <Divider />}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }}>
                  <Text>{label}</Text>
                  <Switch
                    color={colors.gold500}
                    value={prefs[key]}
                    onValueChange={(v) => savePrefs({ ...prefs, [key]: v })}
                  />
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card style={{ marginTop: 12, backgroundColor: colors.elevated }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              Language
            </Text>
            <RadioButton.Group onValueChange={(v) => savePrefs({ ...prefs, language: v })} value={prefs.language}>
              {LANGUAGES.map((l) => (
                <View key={l.value} style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                  <RadioButton value={l.value} color={colors.gold500} />
                  <Text>{l.label}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          textColor="#c0392b"
          style={{ marginTop: 16 }}
          onPress={async () => {
            await api.auth.logout();
            await tokenStore.clearTokens();
            dispatch(setUser(null));
            router.replace("/welcome");
          }}
        >
          Log out
        </Button>
      </Animated.View>
    </ScrollView>
  );
}
