"use client";

import { useAudioPlayer, type NowPlayingTrack } from "./AudioPlayerContext";

// Spotify 앨범 ID는 22자 base62 — 시드/목 데이터(seed-1 등)와 구분해 실제 Spotify 콘텐츠일 때만 링크 노출
const REAL_SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export type ToolbarTrack = {
  id: number;
  title: string;
  previewUrl: string | null;
};

// 전체재생 + Spotify에서 열기. size="lg"는 점수 영역, size="sm"은 수록곡 헤더 위치용 (위치·크기 맞바꿈).
export function AlbumPlayToolbar({
  tracks,
  spotifyAlbumId,
  albumArtist,
  albumCoverImageUrl,
  size = "lg",
}: {
  tracks: ToolbarTrack[];
  spotifyAlbumId: string | null;
  albumArtist: string;
  albumCoverImageUrl: string | null;
  size?: "sm" | "lg";
}) {
  const { current, isPlaying, playQueue, pause } = useAudioPlayer();

  const playable: NowPlayingTrack[] = tracks
    .filter((t): t is ToolbarTrack & { previewUrl: string } => Boolean(t.previewUrl))
    .map((t) => ({
      id: t.id,
      title: t.title,
      artist: albumArtist,
      coverImageUrl: albumCoverImageUrl,
      previewUrl: t.previewUrl,
    }));

  const isThisAlbumPlaying = isPlaying && playable.some((t) => t.id === current?.id);
  const isRealSpotifyId = spotifyAlbumId && REAL_SPOTIFY_ID.test(spotifyAlbumId);

  const playBtnClass =
    size === "lg"
      ? "inline-flex items-center gap-1.5 rounded-full bg-acc px-4 py-2 text-sm font-semibold text-on-acc"
      : "inline-flex items-center gap-1.5 rounded-full bg-acc px-4 py-1.5 text-xs font-semibold text-on-acc";
  const linkBtnClass =
    size === "lg"
      ? "inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-mut hover:border-acc hover:text-fg"
      : "inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs text-mut hover:border-acc hover:text-fg";

  return (
    <div className="flex items-center gap-3">
      {playable.length > 0 && (
        <button onClick={() => (isThisAlbumPlaying ? pause() : playQueue(playable))} className={playBtnClass}>
          {isThisAlbumPlaying ? <PauseIcon /> : <PlayIcon />}
          {isThisAlbumPlaying ? "일시정지" : "전체 재생"}
        </button>
      )}
      {isRealSpotifyId && (
        <a
          href={`https://open.spotify.com/album/${spotifyAlbumId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkBtnClass}
        >
          <ExternalLinkIcon />
          Spotify에서 열기
        </a>
      )}
    </div>
  );
}
