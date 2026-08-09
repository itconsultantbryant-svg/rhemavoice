import { router, type Href } from "expo-router";
import { Image, Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Chip, IconButton, Text } from "react-native-paper";
import { displayName, type Role } from "@rhemavoice/shared";
import { api, tokenStore } from "../../../lib/api";
import { setUser, useAppDispatch, useAppSelector } from "../../../store";
import { colors } from "../../../theme";

const MENU: Array<{ icon: string; label: string; route?: Href; action?: "logout" }> = [
  { icon: "account-edit-outline", label: "My Profile", route: "/(app)/settings" },
  { icon: "book-open-page-variant", label: "My Courses", route: "/(app)/academy" },
  { icon: "microphone", label: "My Rooms", route: "/(app)/(tabs)/rooms" },
  { icon: "ticket-confirmation", label: "My Bookings", route: "/(app)/ticketing" },
  { icon: "briefcase-outline", label: "My Applications", route: "/(app)/opportunities" },
  { icon: "wallet-outline", label: "Wallet", route: "/(app)/wallet" },
  { icon: "cog-outline", label: "Settings", route: "/(app)/settings" },
  { icon: "help-circle-outline", label: "Help & Support", route: "/(app)/(tabs)/alerts" },
  { icon: "logout", label: "Log Out", action: "logout" },
];

const ROLE_LABELS: Record<string, string> = {
  general_user: "General User",
  member: "Member",
  student: "Student",
  teacher: "Teacher",
  pastor: "Pastor",
  church_admin: "Church Admin",
  academy_admin: "Academy Admin",
  radio_admin: "Radio Admin",
  business_admin: "Business Admin",
  employer: "Employer",
  job_seeker: "Job Seeker",
  event_organizer: "Event Organizer",
  travel_partner: "Travel Partner",
  transport_partner: "Transport Partner",
  platform_admin: "Platform Admin",
  super_admin: "Super Admin",
  moderator: "Moderator",
  support_agent: "Support Agent",
  finance_officer: "Finance Officer",
};

export default function ProfileScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();

  if (!user) {
    router.replace("/welcome");
    return null;
  }

  const name = displayName(user);
  const handle = user.email;
  const initialsName = `${user.first_name} ${user.last_name}`.trim() || user.email;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInUp.duration(280)}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text
            style={{
              color: colors.gold500,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontSize: 10,
              fontWeight: "700",
            }}
          >
            RhemaVoice
          </Text>
          <IconButton
            icon="cog-outline"
            iconColor={colors.inkMuted}
            size={22}
            onPress={() => router.push("/(app)/settings")}
          />
        </View>

        {/* Profile header */}
        <View style={{ alignItems: "center", marginTop: 20 }}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={{ width: 92, height: 92, borderRadius: 46 }} />
          ) : (
            <Avatar.Text
              size={92}
              label={initials(initialsName)}
              color={colors.gold300}
              style={{ backgroundColor: colors.purple900, borderWidth: 2, borderColor: "rgba(197,160,72,0.5)" }}
            />
          )}
          <Text variant="headlineSmall" style={{ color: colors.ink, fontWeight: "800", marginTop: 12 }}>
            {name}
          </Text>
          <Text style={{ color: colors.inkMuted, fontSize: 13, marginTop: 2 }}>{handle}</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 10 }}>
            {user.roles.slice(0, 3).map((r: Role) => (
              <Chip
                key={r}
                compact
                style={{ backgroundColor: "rgba(197,160,72,0.12)" }}
                textStyle={{ color: colors.gold500, fontWeight: "700", fontSize: 10 }}
              >
                {ROLE_LABELS[r] || r}
              </Chip>
            ))}
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          {[
            { value: "—", label: "Following" },
            { value: "—", label: "Followers" },
            { value: "—", label: "Courses" },
            { value: "—", label: "Certificates" },
          ].map((s) => (
            <View
              key={s.label}
              style={{
                flex: 1,
                backgroundColor: colors.elevated,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(248,245,252,0.08)",
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.gold500, fontWeight: "800", fontSize: 16 }}>{s.value}</Text>
              <Text style={{ color: colors.inkMuted, fontSize: 10, marginTop: 2, textAlign: "center" }}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {user.bio ? (
          <View style={{ marginTop: 16, backgroundColor: colors.elevated, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "rgba(248,245,252,0.08)" }}>
            <Text style={{ color: colors.inkMuted, fontSize: 13, lineHeight: 19 }}>{user.bio}</Text>
          </View>
        ) : null}

        {/* Menu */}
        <View style={{ marginTop: 24, backgroundColor: colors.elevated, borderRadius: 16, borderWidth: 1, borderColor: "rgba(248,245,252,0.08)", overflow: "hidden" }}>
          {MENU.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={() => {
                if (item.action === "logout") {
                  api.auth.logout().finally(async () => {
                    await tokenStore.clearTokens();
                    dispatch(setUser(null));
                    router.replace("/welcome");
                  });
                  return;
                }
                if (item.route) router.push(item.route);
              }}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 15,
                  borderBottomWidth: i < MENU.length - 1 ? 1 : 0,
                  borderBottomColor: "rgba(248,245,252,0.06)",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <IconButton icon={item.icon} iconColor={item.action === "logout" ? colors.danger : colors.gold500} size={22} style={{ margin: 0 }} />
              <Text style={{ flex: 1, fontWeight: "600", color: item.action === "logout" ? colors.danger : colors.ink, fontSize: 15 }}>
                {item.label}
              </Text>
              <Text style={{ color: colors.inkMuted }}>›</Text>
            </Pressable>
          ))}
        </View>

        <Text style={{ textAlign: "center", color: colors.inkMuted, fontSize: 11, marginTop: 24 }}>
          RhemaVoice Technologies Inc. · v0.1.0
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
