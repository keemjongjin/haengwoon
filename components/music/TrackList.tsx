"use client";

import { useState } from "react";

export type Track = {
  id: number;
  title: string;
  trackNumber: number;
  isFavorite: boolean;
};

// 수록곡 목록 + 최애(🔥) 토글. 토글은 관리자만 성공(비관리자는 401 → 원복).
export function TrackList({ tracks: initial }: { tracks: Track[] }) {
  const [tracks, setTracks] = useState(initial);
  const [hint, setHint] = useState("");

  async function toggle(id: number) {
    const prev = tracks;
    setTracks((ts) =>
      ts.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
    const res = await fetch("/api/tracks/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: id }),
    });
    if (!res.ok) {
      setTracks(prev); // 원복
      setHint("최애 변경은 관리자만 가능합니다.");
      setTimeout(() => setHint(""), 2000);
    }
  }

  return (
    <div>
      <ul>
        {tracks.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-3 border-b border-line py-2.5 text-sm"
          >
            <span className="w-5 text-right text-mut">{t.trackNumber}</span>
            <span className="flex-1">{t.title}</span>
            <button
              onClick={() => toggle(t.id)}
              aria-label="최애 토글"
              className={t.isFavorite ? "" : "opacity-30 grayscale"}
            >
              🔥
            </button>
          </li>
        ))}
      </ul>
      {hint && <p className="mt-2 text-xs text-mut">{hint}</p>}
    </div>
  );
}
