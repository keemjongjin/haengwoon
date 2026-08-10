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

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// 캡슐형 플로팅 재생바. Music 영역(/music, /artist)에서만 보이고 그 외에선 사라짐 +
// 재생 중 다른 곳으로 나가면 자동 정지. 곡이 없을 땐 정보 영역 중앙에 클로버 로고를 idle 상태로 표시.
//
// 음원에 따라 형태가 달라진다:
//  - Deezer 미리듣기(30초): 탐색할 구간이 사실상 없어 재생바(seek)를 두지 않는다.
//  - Spotify 전곡 재생: 곡이 길어 탐색이 필요하므로 seek 가능한 진행바를 띄운다.
//    (SpotifyFullPlayer가 컨텍스트에 등록한 fullPlayback 이 있을 때만)
/** app/layout.tsx에 항상 마운트돼있는 화면 하단 고정 미니 플레이어. 라우트에 따라 스스로 보임/숨김을 결정. */
export function NowPlayingBar() {
  const pathname = usePathname();
  const inMusicMode =
    pathname === "/music" || pathname.startsWith("/music/") || pathname.startsWith("/artist/");
  const { current, isPlaying, volume, play, pause, setVolume, fullPlayback } = useAudioPlayer();

  useEffect(() => {
    if (!inMusicMode) pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inMusicMode]);

  if (!inMusicMode) return null;

  // Spotify 전곡 재생이 잡혀 있으면 그쪽을 우선 표시 — 실제로 소리가 나는 쪽과 컨트롤을 일치시킨다.
  const spotify = fullPlayback;
  const showing = spotify
    ? { title: spotify.title, artist: spotify.artist, coverImageUrl: spotify.coverImageUrl }
    : current;
  const playing = spotify ? !spotify.isPaused : isPlaying;
  const pct = spotify && spotify.duration > 0 ? (spotify.position / spotify.duration) * 100 : 0;

  return (
    <div className="sticky bottom-6 z-40 mb-6 flex justify-center px-4">
      <div
        className={
          "w-full max-w-md rounded-3xl border border-line bg-bg/95 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-bg/85 " +
          (spotify ? "px-4 py-3" : "rounded-full py-2 pl-2 pr-4")
        }
      >
        <div className="flex items-center gap-3">
          {showing ? (
            <>
              {showing.coverImageUrl ? (
                <Image
                  src={showing.coverImageUrl}
                  alt={showing.title}
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-full bg-card" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{showing.title}</p>
                <p className="truncate text-xs text-mut">{showing.artist}</p>
              </div>
            </>
          ) : (
            <div className="flex h-9 flex-1 items-center justify-center">
              <Logo size={18} className="text-mut/50" />
            </div>
          )}

          <button
            onClick={() => {
              if (spotify) spotify.togglePlay();
              else if (!current) return;
              else if (isPlaying) pause();
              else play(current);
            }}
            disabled={!showing}
            aria-label={playing ? "일시정지" : "재생"}
            className="flex shrink-0 items-center justify-center text-fg disabled:text-mut/40"
          >
            {playing ? <PauseGlyph /> : <PlayGlyph />}
          </button>

          {/* 음량은 Deezer(자체 <audio>)만 조절 가능 — Spotify 임베드 볼륨은 우리가 못 건드린다 */}
          {current && !spotify && (
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

        {/* seek 바 — Spotify 전곡 재생일 때만. 드래그하면 그 위치로 이동한다. */}
        {spotify && (
          <div className="mt-2 flex items-center gap-2">
            <span className="w-9 shrink-0 text-[10px] tabular-nums text-mut">{fmt(spotify.position)}</span>
            <input
              type="range"
              min={0}
              max={Math.max(1, spotify.duration)}
              step={1}
              value={Math.min(spotify.position, spotify.duration)}
              onChange={(e) => spotify.seek(Number(e.target.value))}
              className="h-1 w-full accent-acc"
              aria-label="재생 위치"
              style={{
                background: `linear-gradient(to right, var(--acc) ${pct}%, var(--line) ${pct}%)`,
              }}
            />
            <span className="w-9 shrink-0 text-right text-[10px] tabular-nums text-mut">
              {fmt(spotify.duration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
