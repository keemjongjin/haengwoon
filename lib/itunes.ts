// iTunes Search API — 인증 불필요, 무료. Spotify가 미리듣기(preview_url) 제공을 중단해
// 대체 소스로 사용. 카탈로그에 없는 곡도 흔하므로 매칭 실패는 항상 null로 허용.
export async function fetchItunesPreviewUrl(trackTitle: string, artist: string): Promise<string | null> {
  const params = new URLSearchParams({
    term: `${artist} ${trackTitle}`,
    media: "music",
    entity: "song",
    limit: "5",
  });
  const res = await fetch(`https://itunes.apple.com/search?${params}`);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: { trackName: string; artistName: string; previewUrl?: string }[];
  };
  const results = data.results ?? [];
  if (results.length === 0) return null;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
  const wantedTrack = normalize(trackTitle);
  const wantedArtist = normalize(artist);
  const best =
    results.find((r) => normalize(r.trackName) === wantedTrack && normalize(r.artistName).includes(wantedArtist)) ??
    results.find((r) => normalize(r.trackName) === wantedTrack) ??
    results[0];
  return best.previewUrl ?? null;
}

// iTunes 비공식 요청 빈도 제한 회피용 짧은 딜레이 (트랙 여러 곡 연속 조회 시 사용)
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
