"use client";

import { useEffect, useState } from "react";

// Spotify 트랙/앨범 ID는 22자 base62. 우리 샘플 데이터(seed-1, mock-xxx)와 구분.
const REAL_SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

// 방문자 공개 재생: Spotify 공식 Embed 위젯 사용 (OAuth·Premium 불필요, 누구나 미리듣기 가능).
// 관리자 전용 Web Playback SDK(월드컵)와는 별개 — DECISIONS.log 참고.
export function SpotifyEmbed({ spotifyAlbumId }: { spotifyAlbumId: string | null }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as "light" | "dark") || "light");
  }, []);

  const isReal = spotifyAlbumId && REAL_SPOTIFY_ID.test(spotifyAlbumId);

  if (!isReal) {
    return (
      <div className="mt-5 rounded-xl border border-line bg-card px-4 py-3 text-sm text-mut">
        🎧 재생은 실제 Spotify 앨범 연동 후 제공됩니다 (현재 샘플 데이터).
      </div>
    );
  }

  const src = `https://open.spotify.com/embed/album/${spotifyAlbumId}?utm_source=generator${
    theme === "dark" ? "&theme=0" : ""
  }`;

  return (
    <iframe
      className="mt-5 w-full rounded-xl"
      src={src}
      width="100%"
      height="152"
      style={{ border: 0 }}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title="Spotify player"
    />
  );
}
