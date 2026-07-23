// Deezer API — 인증 불필요, 무료. 미리듣기 30초 제공.
// 주의: Deezer 미리듣기 URL은 ~15분 만료되는 서명형이라 저장하면 안 됨.
// 대신 트랙 ID만 저장(/api/deezer-preview/{id} 프록시)하고, 재생 시점에 신선한 URL을 발급받는다.

export type DeezerTrackResult = {
  trackId: string;
  title: string;
  artist: string;
  album: string;
};

type DeezerApiTrack = {
  id: number;
  title: string;
  artist?: { name: string };
  album?: { title: string };
  preview?: string;
};

/** 재생용 프록시 경로 — previewUrl 컬럼에 이 값을 저장한다 (클라이언트는 그대로 <audio src>로 사용). */
export function deezerProxyUrl(trackId: string | number): string {
  return `/api/deezer-preview/${trackId}`;
}

/** 관리자 수동 검색용 — 미리듣기 있는 결과만 반환 */
export async function searchDeezerTracks(term: string, limit = 10): Promise<DeezerTrackResult[]> {
  const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(term)}&limit=${limit}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: DeezerApiTrack[] };
  return (data.data ?? [])
    .filter((t) => Boolean(t.preview))
    .map((t) => ({
      trackId: String(t.id),
      title: t.title,
      artist: t.artist?.name ?? "",
      album: t.album?.title ?? "",
    }));
}

/** 백필용 자동 매칭 — 곡명/아티스트로 검색해 가장 적합한 트랙의 ID 반환(없으면 null). */
export async function matchDeezerTrackId(trackTitle: string, artist: string): Promise<string | null> {
  const results = await searchDeezerTracks(`${artist} ${trackTitle}`, 10);
  if (results.length === 0) return null;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
  const wantedTrack = normalize(trackTitle);
  const wantedArtist = normalize(artist);
  const best =
    results.find((r) => normalize(r.title) === wantedTrack && normalize(r.artist).includes(wantedArtist)) ??
    results.find((r) => normalize(r.title) === wantedTrack) ??
    results[0];
  return best.trackId;
}

/** 프록시 엔드포인트용 — 트랙 ID로 지금 유효한 미리듣기 URL을 받아온다(만료 전). */
export async function getDeezerPreviewUrl(trackId: string): Promise<string | null> {
  const res = await fetch(`https://api.deezer.com/track/${encodeURIComponent(trackId)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as DeezerApiTrack & { error?: unknown };
  if (data.error || !data.preview) return null;
  return data.preview;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
