"use client";

import { useAudioPlayer } from "./AudioPlayerContext";
import { NoteIcon } from "./NoteIcon";

// 재생 중임을 보여주는 사운드 웨이브 (CSS 애니메이션, 외부 라이브러리 없음)
function SoundWave() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full bg-acc"
          style={{
            animation: `haengwoon-wave 0.9s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes haengwoon-wave {
          0%, 100% { height: 30%; }
          50% { height: 100%; }
        }
      `}</style>
    </span>
  );
}

export function HeroFavoriteTrack({ id, title }: { id: number; title: string }) {
  const { current, isPlaying } = useAudioPlayer();
  const playing = current?.id === id && isPlaying;

  return (
    <div className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-line bg-card px-3.5 py-2">
      <NoteIcon className="h-3.5 w-3.5 shrink-0 text-mut" />
      <span className="max-w-[12rem] truncate text-sm font-medium">{title}</span>
      {playing && <SoundWave />}
    </div>
  );
}
