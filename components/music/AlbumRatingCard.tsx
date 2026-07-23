"use client";

import Image from "next/image";
import Link from "next/link";
import { useAudioPlayer } from "./AudioPlayerContext";
import { NoteIcon } from "./NoteIcon";
import { ratingColor } from "@/lib/rating";
import { LikeButton } from "./LikeButton";

const HUES = ["#c026d3", "#dc2626", "#1d4ed8", "#0891b2", "#7c3aed", "#ea580c"];

const TYPE_LABEL: Record<string, string> = {
  album: "Album",
  single: "Single",
  compilation: "Compilation",
};

export type AlbumCardData = {
  id: number;
  spotifyAlbumId?: string | null;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  albumType?: string | null;
  manualRating: number | null;
  review?: string | null;
  favoriteTrack?: {
    id: number;
    title: string;
    previewUrl?: string | null;
    manualRating?: number | null;
  } | null;
};

// 우측 원형 프로그레스 링으로 평점을 표시. 레퍼런스(Beli류 평점 카드) 스타일.
// 색상은 평점 구간(빨강/주황/초록)에 따라 달라짐.
function RatingRing({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 10));
  const color = ratingColor(value);
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
        {value.toFixed(1)}
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

// 모던 카드형 앨범 UI — 프로스티드 글래스 배경 + 원형 프로그레스 평점 링 + FAVORITE SONG.
// 앨범 상세 링크와 아티스트 링크가 중첩되지 않도록(유효 HTML) 영역별로 개별 Link 사용.
// 최애곡 재생은 전역 재생바(AudioPlayerContext) 공유 — 한 번에 한 곡만 재생.
export function AlbumRatingCard({ album }: { album: AlbumCardData }) {
  const { current, isPlaying, play } = useAudioPlayer();

  const hue = HUES[album.id % HUES.length];
  const typeLabel = TYPE_LABEL[album.albumType ?? "album"] ?? "Album";
  const albumHref = `/music/album/${album.spotifyAlbumId ?? album.id}`;
  const artistHref = `/artist/${encodeURIComponent(album.artist)}`;
  const previewUrl = album.favoriteTrack?.previewUrl;
  const playing = Boolean(album.favoriteTrack && current?.id === album.favoriteTrack.id && isPlaying);

  function togglePreview(e: React.MouseEvent) {
    e.preventDefault();
    if (!previewUrl || !album.favoriteTrack) return;
    play({
      id: album.favoriteTrack.id,
      title: album.favoriteTrack.title,
      artist: album.artist,
      coverImageUrl: album.coverImageUrl,
      previewUrl,
      manualRating: album.favoriteTrack.manualRating ?? null,
    });
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl p-4 text-white transition-transform hover:-translate-y-0.5">
      {/* 배경: 커버를 흐리고 채도를 낮춘 프로스티드 글래스 (레퍼런스 톤) */}
      <div className="absolute inset-0 -z-20">
        {album.coverImageUrl ? (
          <div
            className="h-full w-full scale-125 bg-cover bg-center blur-2xl saturate-50 brightness-[0.42]"
            style={{ backgroundImage: `url(${album.coverImageUrl})` }}
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(160deg, ${hue}33, #171717)` }}
          />
        )}
      </div>
      <div className="absolute inset-0 -z-10 bg-black/25" />

      <div className="flex items-center gap-3">
        <Link href={albumHref} className="shrink-0">
          {album.coverImageUrl ? (
            <Image
              src={album.coverImageUrl}
              alt={album.title}
              width={56}
              height={56}
              className="h-14 w-14 rounded-lg object-cover shadow-md"
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-lg text-lg font-bold"
              style={{ background: `${hue}55` }}
            >
              {album.title.slice(0, 1)}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={albumHref}>
            <h3 className="truncate font-bold hover:underline">{album.title}</h3>
          </Link>
          <p className="flex items-center gap-1 text-sm text-white/60">
            <NoteIcon className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">
              {typeLabel} ·{" "}
              <Link href={artistHref} className="hover:text-white hover:underline">
                {album.artist}
              </Link>
            </span>
          </p>
        </div>
        <Link href={albumHref}>
          {album.manualRating != null && <RatingRing value={album.manualRating} />}
        </Link>
      </div>

      {album.review && (
        <div className="mt-3 flex items-center gap-3">
          <Link href={albumHref} className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm italic text-white/70">&ldquo;{album.review}&rdquo;</p>
          </Link>
          <LikeButton albumId={album.id} variant="minimal" className="text-white/60 hover:text-red-400" />
        </div>
      )}

      {album.favoriteTrack && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
            Favorite Song
          </p>
          <div className="flex items-center gap-3">
            <Link href={albumHref} className="flex min-w-0 flex-1 items-center gap-3">
              {album.coverImageUrl ? (
                <Image
                  src={album.coverImageUrl}
                  alt={album.favoriteTrack.title}
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div
                  className="h-11 w-11 shrink-0 rounded-md"
                  style={{ background: `${hue}55` }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{album.favoriteTrack.title}</p>
                <p className="truncate text-xs text-white/60">{album.artist}</p>
              </div>
            </Link>
            <button
              onClick={togglePreview}
              disabled={!previewUrl}
              aria-label={playing ? "일시정지" : "최애곡 미리듣기"}
              className="flex h-8 w-8 shrink-0 items-center justify-center text-white disabled:opacity-40"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
