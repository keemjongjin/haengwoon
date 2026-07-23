"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/common/Logo";
import { useAudioPlayer } from "./AudioPlayerContext";

function PlayGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="4 8 8 8 12 4 12 20 8 16 4 16 4 8" />
      <path d="M16 8.5a4.5 4.5 0 0 1 0 7" />
    </svg>
  );
}

// 캡슐형 플로팅 재생바. Music 영역(/music, /artist)에서만 보이고 그 외에선 사라짐 +
// 재생 중 다른 곳으로 나가면 자동 정지. 곡이 없을 땐 정보 영역 중앙에 클로버 로고를 idle 상태로 표시.
export function NowPlayingBar() {
  const pathname = usePathname();
  const inMusicMode =
    pathname === "/music" || pathname.startsWith("/music/") || pathname.startsWith("/artist/");
  const { current, isPlaying, volume, play, pause, setVolume } = useAudioPlayer();

  useEffect(() => {
    if (!inMusicMode) pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inMusicMode]);

  if (!inMusicMode) return null;

  return (
    <div className="sticky bottom-6 z-40 mb-6 flex justify-center px-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-full border border-line bg-bg/95 py-2 pl-2 pr-4 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-bg/85">
        {current ? (
          <>
            {current.coverImageUrl ? (
              <Image
                src={current.coverImageUrl}
                alt={current.title}
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="h-9 w-9 shrink-0 rounded-full bg-card" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{current.title}</p>
              <p className="truncate text-xs text-mut">{current.artist}</p>
            </div>
          </>
        ) : (
          <div className="flex h-9 flex-1 items-center justify-center">
            <Logo size={18} className="text-mut/50" />
          </div>
        )}

        <button
          onClick={() => current && (isPlaying ? pause() : play(current))}
          disabled={!current}
          aria-label={isPlaying ? "일시정지" : "재생"}
          className="flex shrink-0 items-center justify-center text-fg disabled:text-mut/40"
        >
          {isPlaying ? <PauseGlyph /> : <PlayGlyph />}
        </button>

        {current && (
          <div className="hidden shrink-0 items-center gap-1.5 text-mut sm:flex">
            <VolumeIcon />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16 accent-acc"
              aria-label="음량"
            />
          </div>
        )}
      </div>
    </div>
  );
}
