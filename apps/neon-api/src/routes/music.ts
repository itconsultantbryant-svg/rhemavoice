import { Hono } from "hono";
import { one, query, uuid } from "../db";
import { requireUser } from "../auth";
import { notFound, respond } from "../http";
import { bool, iso, num } from "../serializers";

export const musicRoutes = new Hono();

type TrackRow = {
  id: string;
  playlist_id?: string | null;
  title: string;
  artist: string;
  album_title: string | null;
  duration_sec: number;
  lyrics: string;
  genre: string;
  play_count: number;
  is_favorite: boolean;
};

type PlaylistRow = {
  id: string;
  title: string;
  is_public: boolean;
  created_at: Date;
};

const TRACK_FIELDS = `t.id, t.title, t.artist, a.title as album_title, t.duration_sec, t.lyrics,
  t.genre, t.play_count`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function serializeTrack(row: TrackRow) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    // DRF's `album_title` field falls back to its `default=""` when the track has no album.
    album_title: row.album_title ?? "",
    duration_sec: num(row.duration_sec),
    lyrics: row.lyrics,
    genre: row.genre,
    play_count: num(row.play_count),
    is_favorite: bool(row.is_favorite),
  };
}

function serializePlaylist(row: PlaylistRow, tracks: TrackRow[]) {
  return {
    id: row.id,
    title: row.title,
    is_public: bool(row.is_public),
    tracks: tracks.map(serializeTrack),
    created_at: iso(row.created_at),
  };
}

async function findTrack(id: string, userId: string): Promise<TrackRow | null> {
  if (!isUuid(id)) return null;
  return one<TrackRow>(
    `select ${TRACK_FIELDS},
            exists(select 1 from music_musicfavorite mf where mf.track_id = t.id and mf.user_id = $2) as is_favorite
       from music_track t
       left join music_album a on a.id = t.album_id
      where t.id = $1`,
    [id, userId],
  );
}

// The m2m manager keeps the Track model's `-play_count, title` ordering.
async function playlistTracks(playlistIds: string[], userId: string): Promise<Map<string, TrackRow[]>> {
  const grouped = new Map<string, TrackRow[]>();
  if (!playlistIds.length) return grouped;
  const rows = await query<TrackRow>(
    `select pt.playlist_id, t.id, t.title, t.artist, a.title as album_title, t.duration_sec,
            t.lyrics, t.genre, t.play_count,
            exists(select 1 from music_musicfavorite mf where mf.track_id = t.id and mf.user_id = $2) as is_favorite
       from music_playlist_tracks pt
       join music_track t on t.id = pt.track_id
       left join music_album a on a.id = t.album_id
      where pt.playlist_id = any($1::uuid[])
      order by pt.playlist_id, t.play_count desc, t.title`,
    [playlistIds, userId],
  );
  for (const row of rows) {
    const key = row.playlist_id ?? "";
    const list = grouped.get(key);
    if (list) list.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}

musicRoutes.get("/tracks/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<TrackRow>(
    `select ${TRACK_FIELDS},
            exists(select 1 from music_musicfavorite mf where mf.track_id = t.id and mf.user_id = $1) as is_favorite
       from music_track t
       left join music_album a on a.id = t.album_id
      order by t.play_count desc, t.title`,
    [auth.user.id],
  );
  return c.json(rows.map(serializeTrack));
});

musicRoutes.post("/tracks/:id/play/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  const track = await findTrack(id, auth.user.id);
  if (!track) return respond(c, notFound());

  await query(`update music_track set play_count = play_count + 1 where id = $1`, [track.id]);
  const updated = await findTrack(track.id, auth.user.id);
  return c.json(serializeTrack(updated as TrackRow));
});

musicRoutes.post("/tracks/:id/favorite/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const id = c.req.param("id");
  const track = await findTrack(id, auth.user.id);
  if (!track) return respond(c, notFound());

  const existing = await one<{ id: string }>(
    `select id from music_musicfavorite where user_id = $1 and track_id = $2`,
    [auth.user.id, track.id],
  );
  if (existing) {
    await query(`delete from music_musicfavorite where id = $1`, [existing.id]);
    return c.json({ favorited: false });
  }
  await query(
    `insert into music_musicfavorite (id, user_id, track_id, created_at) values ($1, $2, $3, now())`,
    [uuid(), auth.user.id, track.id],
  );
  return c.json({ favorited: true }, 201);
});

musicRoutes.get("/artists/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<{ id: string; name: string; bio: string }>(
    `select id, name, bio from music_artist order by id`,
  );
  return c.json(rows.map((r) => ({ id: r.id, name: r.name, bio: r.bio })));
});

musicRoutes.get("/albums/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<{ id: string; title: string; artist_name: string; year: number }>(
    `select al.id, al.title, ar.name as artist_name, al.year
       from music_album al
       join music_artist ar on ar.id = al.artist_id
      order by al.id`,
  );
  return c.json(
    rows.map((r) => ({ id: r.id, title: r.title, artist_name: r.artist_name, year: num(r.year) })),
  );
});

musicRoutes.get("/playlists/", async (c) => {
  const auth = await requireUser(c);
  if (!auth.ok) return respond(c, auth.response);

  const rows = await query<PlaylistRow>(
    `select id, title, is_public, created_at from music_playlist where user_id = $1 order by id`,
    [auth.user.id],
  );
  const tracks = await playlistTracks(rows.map((r) => r.id), auth.user.id);
  return c.json(rows.map((r) => serializePlaylist(r, tracks.get(r.id) ?? [])));
});
