// Spotify 어댑터. 키(env) 없으면 mock으로 동작 → 키 확보 후 env만 채우면 실연동.
// PLAN.md §5.5. 앨범 메타(client credentials) + 재생(SDK) 모두 담당.

export type PlaybackToken = { accessToken: string; expiresAt: number; mock: boolean };

export type SpotifyTrack = {
  spotifyTrackId: string;
  title: string;
  trackNumber: number;
};

export type SpotifyAlbum = {
  spotifyAlbumId: string;
  title: string;
  artist: string;
  coverImageUrl: string;
  releaseDate: string;
  genre?: string;
  tracks: SpotifyTrack[];
};

export interface SpotifyAdapter {
  isConfigured(): boolean;
  getPlaybackToken(): Promise<PlaybackToken>;
  searchAlbums(query: string): Promise<SpotifyAlbum[]>;
  getAlbum(spotifyAlbumId: string): Promise<SpotifyAlbum | null>;
}

function hasKeys() {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REFRESH_TOKEN
  );
}

// --- mock 데이터 ---
const MOCK_ALBUMS: SpotifyAlbum[] = [
  {
    spotifyAlbumId: "mock-loveless",
    title: "Loveless",
    artist: "My Bloody Valentine",
    coverImageUrl: "https://placehold.co/300x300/c026d3/fff?text=Loveless",
    releaseDate: "1991-11-04",
    genre: "Shoegaze",
    tracks: [
      { spotifyTrackId: "t1", title: "Only Shallow", trackNumber: 1 },
      { spotifyTrackId: "t2", title: "Loomer", trackNumber: 2 },
      { spotifyTrackId: "t3", title: "Sometimes", trackNumber: 7 },
    ],
  },
  {
    spotifyAlbumId: "mock-inrainbows",
    title: "In Rainbows",
    artist: "Radiohead",
    coverImageUrl: "https://placehold.co/300x300/dc2626/fff?text=In+Rainbows",
    releaseDate: "2007-10-10",
    genre: "Art Rock",
    tracks: [
      { spotifyTrackId: "t4", title: "15 Step", trackNumber: 1 },
      { spotifyTrackId: "t5", title: "Nude", trackNumber: 3 },
      { spotifyTrackId: "t6", title: "Reckoner", trackNumber: 7 },
    ],
  },
];

const mockAdapter: SpotifyAdapter = {
  isConfigured: () => false,
  async getPlaybackToken() {
    return { accessToken: "mock-token", expiresAt: Date.now() + 3600_000, mock: true };
  },
  async searchAlbums(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_ALBUMS;
    return MOCK_ALBUMS.filter(
      (a) =>
        a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
    );
  },
  async getAlbum(id: string) {
    return MOCK_ALBUMS.find((a) => a.spotifyAlbumId === id) ?? null;
  },
};

const realAdapter: SpotifyAdapter = {
  isConfigured: () => true,
  async getPlaybackToken(): Promise<PlaybackToken> {
    throw new Error("Spotify 실연동 미구현 — Epic 4에서 refresh_token 교환 구현 예정");
  },
  async searchAlbums(): Promise<SpotifyAlbum[]> {
    throw new Error("Spotify 실연동 미구현 — Epic 3 후반 client credentials 구현 예정");
  },
  async getAlbum(): Promise<SpotifyAlbum | null> {
    throw new Error("Spotify 실연동 미구현");
  },
};

export const spotify: SpotifyAdapter = hasKeys() ? realAdapter : mockAdapter;
