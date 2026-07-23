// Spotify 어댑터. 키(env) 없으면 mock으로 동작 → 키 확보 후 env만 채우면 실연동.
// PLAN.md §5.5. 앨범 메타(client credentials) + 재생(SDK, refresh token) 은 별개 자격증명.

export type PlaybackToken = { accessToken: string; expiresAt: number; mock: boolean };

export type SpotifyTrack = {
  spotifyTrackId: string;
  title: string;
  trackNumber: number;
  durationMs?: number;
  previewUrl?: string | null; // Spotify 정책상 많은 트랙에서 null일 수 있음
};

export type SpotifyAlbum = {
  spotifyAlbumId: string;
  title: string;
  artist: string;
  coverImageUrl: string;
  releaseDate: string;
  genre?: string;
  albumType?: string; // album | single | compilation
  tracks: SpotifyTrack[];
};

export interface SpotifyAdapter {
  isConfigured(): boolean;
  getPlaybackToken(): Promise<PlaybackToken>;
  searchAlbums(query: string): Promise<SpotifyAlbum[]>;
  getAlbum(spotifyAlbumId: string): Promise<SpotifyAlbum | null>;
}

// 메타데이터(검색·조회) = Client ID/Secret만 있으면 됨.
export function hasClientCreds() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}
// 재생(SDK) = 그 위에 관리자 본인 계정 refresh token까지 필요.
export function hasPlaybackCreds() {
  return hasClientCreds() && Boolean(process.env.SPOTIFY_REFRESH_TOKEN);
}

// --- mock 데이터 (Client 키 미설정 시) ---
const MOCK_ALBUMS: SpotifyAlbum[] = [
  {
    spotifyAlbumId: "mock-loveless",
    title: "Loveless",
    artist: "My Bloody Valentine",
    coverImageUrl: "https://placehold.co/300x300/c026d3/fff?text=Loveless",
    releaseDate: "1991-11-04",
    genre: "Shoegaze",
    albumType: "album",
    tracks: [
      { spotifyTrackId: "t1", title: "Only Shallow", trackNumber: 1, durationMs: 258000, previewUrl: null },
      { spotifyTrackId: "t2", title: "Loomer", trackNumber: 2, durationMs: 195000, previewUrl: null },
      { spotifyTrackId: "t3", title: "Sometimes", trackNumber: 7, durationMs: 328000, previewUrl: null },
    ],
  },
  {
    spotifyAlbumId: "mock-inrainbows",
    title: "In Rainbows",
    artist: "Radiohead",
    coverImageUrl: "https://placehold.co/300x300/dc2626/fff?text=In+Rainbows",
    releaseDate: "2007-10-10",
    genre: "Art Rock",
    albumType: "album",
    tracks: [
      { spotifyTrackId: "t4", title: "15 Step", trackNumber: 1, durationMs: 237000, previewUrl: null },
      { spotifyTrackId: "t5", title: "Nude", trackNumber: 3, durationMs: 254000, previewUrl: null },
      { spotifyTrackId: "t6", title: "Reckoner", trackNumber: 7, durationMs: 290000, previewUrl: null },
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
      (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
    );
  },
  async getAlbum(id: string) {
    return MOCK_ALBUMS.find((a) => a.spotifyAlbumId === id) ?? null;
  },
};

// --- 실제 Spotify Web API (Client Credentials Flow: 앱 단위 토큰, 메타데이터 전용) ---
let appToken: { token: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (appToken && Date.now() < appToken.expiresAt - 5000) return appToken.token;
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Spotify 앱 토큰 발급 실패: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  appToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return appToken.token;
}

type SpotifyApiAlbum = {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  release_date: string;
  genres?: string[];
  album_type?: string;
  tracks?: {
    items: {
      id: string;
      name: string;
      track_number: number;
      duration_ms?: number;
      preview_url?: string | null;
    }[];
  };
};

function mapAlbum(a: SpotifyApiAlbum): SpotifyAlbum {
  return {
    spotifyAlbumId: a.id,
    title: a.name,
    artist: a.artists.map((x) => x.name).join(", "),
    coverImageUrl: a.images?.[0]?.url ?? "",
    releaseDate: a.release_date,
    // Spotify가 앨범/아티스트 genres 필드 제공을 중단해 항상 빈 배열 → 등록 시 관리자가 직접 입력.
    genre: a.genres?.[0],
    albumType: a.album_type,
    tracks: (a.tracks?.items ?? []).map((t) => ({
      spotifyTrackId: t.id,
      title: t.name,
      trackNumber: t.track_number,
      durationMs: t.duration_ms,
      previewUrl: t.preview_url ?? null,
    })),
  };
}

const realAdapter: SpotifyAdapter = {
  isConfigured: () => true,

  async searchAlbums(query: string): Promise<SpotifyAlbum[]> {
    if (!query.trim()) return [];
    const token = await getAppToken();
    const params = new URLSearchParams({ q: query, type: "album", limit: "10" });
    const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Spotify 검색 실패: ${res.status}`);
    const data = await res.json();
    return ((data.albums?.items ?? []) as SpotifyApiAlbum[]).map(mapAlbum);
  },

  async getAlbum(id: string): Promise<SpotifyAlbum | null> {
    const token = await getAppToken();
    const res = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Spotify 앨범 조회 실패: ${res.status}`);
    // 메타데이터만 반환(빠름). Spotify가 preview_url을 안 주므로 미리듣기는 여기서 채우지 않고,
    // 등록 후 관리자가 "미리듣기 채우기"(backfill-previews 라우트)로 보완한다.
    // 미리듣기 백필을 여기서 인라인으로 돌리면 트랙 많은 앨범이 서버리스 타임아웃을
    // 넘겨 등록 자체가 실패하기 때문. backfill 라우트는 증분 저장+재실행 이어받기라 안전하다.
    return mapAlbum(await res.json());
  },

  async getPlaybackToken(): Promise<PlaybackToken> {
    if (!hasPlaybackCreds()) {
      throw new Error(
        "SPOTIFY_REFRESH_TOKEN이 없습니다. /api/spotify/authorize 로 관리자 계정을 연결하세요."
      );
    }
    const id = process.env.SPOTIFY_CLIENT_ID!;
    const secret = process.env.SPOTIFY_CLIENT_SECRET!;
    const basic = Buffer.from(`${id}:${secret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
      }),
    });
    if (!res.ok) throw new Error(`Spotify 재생 토큰 갱신 실패: ${res.status}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    return { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000, mock: false };
  },
};

export const spotify: SpotifyAdapter = hasClientCreds() ? realAdapter : mockAdapter;

// --- 관리자 1인 OAuth (Authorization Code Flow) — refresh token 발급용 ---
// 방문자 재생은 SpotifyEmbed(공개 위젯)가 담당하므로 이 플로우는 관리자 전용 SDK 재생에만 쓰인다.
export const SPOTIFY_AUTH_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

export const SPOTIFY_STATE_COOKIE = "spotify_oauth_state";

export function getSpotifyRedirectUri(): string {
  return process.env.SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000/api/spotify/callback";
}

export function buildSpotifyAuthorizeUrl(state: string): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) throw new Error("SPOTIFY_CLIENT_ID가 설정되지 않았습니다.");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_AUTH_SCOPES,
    redirect_uri: getSpotifyRedirectUri(),
    state,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeSpotifyCode(
  code: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify 클라이언트 키가 설정되지 않았습니다.");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getSpotifyRedirectUri(),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify 토큰 교환 실패: ${res.status} ${text}`);
  }
  return res.json();
}
