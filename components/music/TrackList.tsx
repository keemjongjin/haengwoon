"use client";

import { useState } from "react";
import { useAudioPlayer } from "./AudioPlayerContext";
import { TrackShareButton } from "./TrackShareButton";

export type Track = {
  id: number;
  title: string;
  trackNumber: number;
  durationMs: number | null;
  previewUrl: string | null;
  isFavorite: boolean;
  manualRating: number | null;
  comment: string | null;
};

function formatDuration(ms: number | null): string {
  if (!ms) return "";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M12 3.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
    </svg>
  );
}

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

function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

// 수록곡 목록. 재생은 전역 재생바(AudioPlayerContext) 공유 — 한 번에 한 곡만 재생.
// 최애(별) 표시는 읽기 전용(변경은 관리자 페이지에서만), 더보기(⋯)에서 코멘트+곡 공유.
export function TrackList({
  tracks,
  albumArtist,
  albumCoverImageUrl,
}: {
  tracks: Track[];
  albumArtist: string;
  albumCoverImageUrl: string | null;
}) {
  const { current, isPlaying, play } = useAudioPlayer();
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  return (
    <ul>
      {tracks.map((t) => {
        const isThisPlaying = current?.id === t.id && isPlaying;
        const menuOpen = openMenuId === t.id;
        return (
          <li key={t.id} className="border-b border-line">
            <div
              className={
                "group flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-card " +
                (isThisPlaying ? "text-acc" : "")
              }
            >
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                <span
                  className={
                    "text-right text-mut transition-opacity " +
                    (t.previewUrl ? (isThisPlaying ? "opacity-0" : "group-hover:opacity-0") : "")
                  }
                >
                  {t.trackNumber}
                </span>
                {t.previewUrl && (
                  <button
                    onClick={() =>
                      play({
                        id: t.id,
                        title: t.title,
                        artist: albumArtist,
                        coverImageUrl: albumCoverImageUrl,
                        previewUrl: t.previewUrl!,
                        manualRating: t.manualRating,
                      })
                    }
                    aria-label={isThisPlaying ? "일시정지" : "미리듣기"}
                    className={
                      "absolute inset-0 flex items-center justify-center rounded-full transition-opacity " +
                      (isThisPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                    }
                  >
                    {isThisPlaying ? <PauseIcon /> : <PlayIcon />}
                  </button>
                )}
              </span>
              <span className={"flex-1 truncate " + (isThisPlaying ? "font-medium" : "")}>{t.title}</span>
              {t.manualRating != null && (
                <span className="text-xs font-medium text-mut">{t.manualRating.toFixed(1)}</span>
              )}
              {t.isFavorite && (
                <span aria-label="최애곡" className="text-acc">
                  <StarIcon filled />
                </span>
              )}
              <span className="w-10 text-right text-xs text-mut">{formatDuration(t.durationMs)}</span>
              <button
                onClick={() => setOpenMenuId(menuOpen ? null : t.id)}
                aria-label="더보기"
                className={menuOpen ? "text-fg" : "text-mut/60 hover:text-fg"}
              >
                <MoreIcon />
              </button>
            </div>

            {menuOpen && (
              <div className="mb-2 ml-9 mr-2 rounded-xl border border-line bg-card p-3 text-sm">
                {t.comment ? (
                  <p className="mb-2 italic text-mut">&ldquo;{t.comment}&rdquo;</p>
                ) : (
                  <p className="mb-2 text-xs text-mut">저장된 코멘트가 없습니다.</p>
                )}
                <TrackShareButton
                  track={{ id: t.id, title: t.title, manualRating: t.manualRating, comment: t.comment }}
                  albumArtist={albumArtist}
                  albumCoverImageUrl={albumCoverImageUrl}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
