import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Avatar, Button, Card, IconButton, Text } from "react-native-paper";
import { api } from "../../lib/api";
import { useAppSelector } from "../../store";
import { colors } from "../../theme";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ErrorScreen } from "../../components/ErrorScreen";

type Track = {
  id: string;
  title: string;
  artist: string;
  album_title: string;
  duration_sec: number;
  genre: string;
  play_count: number;
  is_favorite: boolean;
};

type Playlist = {
  id: string;
  title: string;
  is_public: boolean;
  tracks: Track[];
};

function duration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function MusicScreen() {
  const user = useAppSelector((s) => s.auth.user);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playing, setPlaying] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    Promise.all([api.music.tracks(), api.music.playlists()])
      .then(([trackData, playlistData]) => {
        const list = trackData as unknown as Track[];
        setTracks(list);
        setPlaylists(playlistData as unknown as Playlist[]);
        setPlaying((current) => (current ? list.find((t) => t.id === current.id) || null : null));
      })
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!user) {
      router.replace("/welcome");
      return;
    }
    load();
  }, [user]);

  function patchTrack(id: string, change: (track: Track) => Track) {
    setTracks((prev) => prev.map((t) => (t.id === id ? change(t) : t)));
    setPlaylists((prev) =>
      prev.map((p) => ({ ...p, tracks: p.tracks.map((t) => (t.id === id ? change(t) : t)) }))
    );
    setPlaying((current) => (current?.id === id ? change(current) : current));
  }

  async function play(track: Track) {
    setPlaying(track);
    await api.music.play(track.id);
    patchTrack(track.id, (t) => ({ ...t, play_count: t.play_count + 1 }));
  }

  async function toggleFavorite(track: Track) {
    await api.music.favorite(track.id);
    patchTrack(track.id, (t) => ({ ...t, is_favorite: !t.is_favorite }));
  }

  if (!user || loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.duration(280)}>
        <Button onPress={() => router.back()} style={{ alignSelf: "flex-start" }}>
          Back
        </Button>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 }}>
          <Avatar.Icon size={44} icon="music" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
          <View>
            <Text variant="headlineSmall" style={{ fontWeight: "800" }}>Music</Text>
            <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{tracks.length} tracks · {playlists.length} playlists</Text>
          </View>
        </View>

        {playing && (
          <Card style={{ marginTop: 16, backgroundColor: colors.navy900, borderRadius: 16 }}>
            <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avatar.Icon size={44} icon="music-note" color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.2)" }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontWeight: "700" }} numberOfLines={1}>{playing.title}</Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }} numberOfLines={1}>
                  {playing.artist}{playing.album_title ? ` · ${playing.album_title}` : ""}
                </Text>
              </View>
              <IconButton icon="pause-circle" iconColor={colors.gold500} size={36} onPress={() => setPlaying(null)} />
            </Card.Content>
          </Card>
        )}

        {playlists.length > 0 && (
          <>
            <Text variant="titleLarge" style={{ marginTop: 24, fontWeight: "700" }}>Playlists</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              {playlists.map((p) => (
                <Card key={p.id} style={{ width: 190, marginRight: 10, backgroundColor: colors.elevated }}>
                  <Card.Content>
                    <Text style={{ fontWeight: "700" }} numberOfLines={1}>{p.title}</Text>
                    <Text style={{ color: colors.inkMuted, fontSize: 11, marginTop: 2 }}>
                      {p.tracks.length} tracks{p.is_public ? " · Public" : ""}
                    </Text>
                    {p.tracks.slice(0, 3).map((t) => (
                      <Text key={t.id} style={{ color: colors.inkMuted, fontSize: 11, marginTop: 6 }} numberOfLines={1}>
                        · {t.title}
                      </Text>
                    ))}
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          </>
        )}

        <Text variant="titleLarge" style={{ marginTop: 24, fontWeight: "700" }}>All Tracks</Text>
        {tracks.map((track) => (
          <Pressable key={track.id} onPress={() => play(track)}>
            <Card style={{ marginTop: 8, backgroundColor: colors.elevated, borderWidth: playing?.id === track.id ? 1.5 : 0, borderColor: colors.gold500 }}>
              <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar.Icon size={38} icon={playing?.id === track.id ? "pause" : "play"} color={colors.gold500} style={{ backgroundColor: "rgba(197,160,72,0.12)" }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700" }} numberOfLines={1}>{track.title}</Text>
                  <Text style={{ color: colors.inkMuted, fontSize: 11 }}>
                    {track.artist} · {duration(track.duration_sec)} · {track.play_count} plays
                  </Text>
                </View>
                <IconButton
                  icon={track.is_favorite ? "heart" : "heart-outline"}
                  iconColor={track.is_favorite ? colors.gold500 : colors.inkMuted}
                  size={20}
                  onPress={() => toggleFavorite(track)}
                />
              </Card.Content>
            </Card>
          </Pressable>
        ))}
      </Animated.View>
    </ScrollView>
  );
}
