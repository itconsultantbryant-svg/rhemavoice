"use client";

import { FadeIn } from "@rhemavoice/ui";
import { useEffect, useState } from "react";
import { ModuleShell } from "@/components/ModuleShell";
import { useAuth } from "@/lib/auth";

type Track = {
  id: string;
  title: string;
  artist: string;
  album_title: string;
  duration_sec: number;
  genre: string;
  play_count: number;
  is_favorite: boolean;
  lyrics?: string;
};

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MusicPage() {
  const { api, user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);

  async function load() {
    const list = (await api.music.tracks()) as unknown as Track[];
    setTracks(list);
    setNowPlaying((prev) => list.find((t) => t.id === prev?.id) || list[0] || null);
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, api]);

  async function play(track: Track) {
    const updated = (await api.music.play(track.id)) as unknown as Track;
    setNowPlaying(updated);
    await load();
  }

  async function favorite(id: string) {
    await api.music.favorite(id);
    await load();
  }

  return (
    <ModuleShell moduleId="music" title="Music" description="Worship tracks, albums, favorites, lyrics, and play counts.">
      <FadeIn>
        <div className="rv-card mb-6 overflow-hidden bg-gradient-to-r from-purple-900 to-purple-700 p-6 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-gold-300">Now playing</p>
          <h2 className="font-display mt-2 text-3xl">{nowPlaying?.title || "Pick a song"}</h2>
          <p className="mt-1 text-white/80">
            {nowPlaying?.artist}
            {nowPlaying?.album_title ? ` · ${nowPlaying.album_title}` : ""}
          </p>
          {nowPlaying?.lyrics && <p className="mt-4 max-w-xl text-sm italic text-white/70">&ldquo;{nowPlaying.lyrics}&rdquo;</p>}
        </div>

        <div className="rv-card overflow-hidden p-0">
          <div className="border-b border-[var(--rv-border)] px-5 py-3 font-display text-lg">Library</div>
          <ul>
            {tracks.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rv-border)] px-5 py-3 last:border-0"
              >
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-[var(--rv-ink-muted)]">
                    {t.artist} · {t.genre} · {t.play_count} plays
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--rv-ink-muted)]">{formatDuration(t.duration_sec)}</span>
                  <button className="rv-btn-ghost text-xs" onClick={() => favorite(t.id)}>
                    {t.is_favorite ? "★" : "☆"}
                  </button>
                  <button className="rv-btn-primary text-xs" onClick={() => play(t)}>
                    Play
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </FadeIn>
    </ModuleShell>
  );
}
