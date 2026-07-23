"use client";

import { useMemo, useState } from "react";
import { AlbumRatingCard } from "./AlbumRatingCard";

export type ChartAlbum = {
  id: number;
  spotifyAlbumId: string | null;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  albumType?: string | null;
  reviewDate: string | null;
  manualRating: number | null;
  eloScore10: number;
  review?: string | null;
  favoriteTrack?: { id: number; title: string; previewUrl?: string | null } | null;
};

type Tab = "rating" | "elo";
const PAGE_SIZE = 10;

function yearOf(d: string | null): string {
  return d ? d.slice(0, 4) : "?";
}

export function ChartsFilters({ albums }: { albums: ChartAlbum[] }) {
  const [tab, setTab] = useState<Tab>("rating");
  const [year, setYear] = useState("전체");
  const [page, setPage] = useState(1);

  const years = useMemo(
    () => ["전체", ...Array.from(new Set(albums.map((a) => yearOf(a.reviewDate)))).sort().reverse()],
    [albums]
  );

  const shown = albums
    .filter((a) => year === "전체" || yearOf(a.reviewDate) === year)
    .sort((a, b) =>
      tab === "rating" ? (b.manualRating ?? 0) - (a.manualRating ?? 0) : b.eloScore10 - a.eloScore10
    )
    .map((a) => ({
      ...a,
      manualRating: tab === "rating" ? a.manualRating : a.eloScore10,
    }));

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = shown.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changeTab(t: Tab) {
    setTab(t);
    setPage(1);
  }

  function changeYear(y: string) {
    setYear(y);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border border-line p-1 text-xs">
        {(
          [
            ["rating", "평점 랭킹"],
            ["elo", "취향 대결 (Elo)"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => changeTab(key)}
            className={
              "rounded-full px-3 py-1.5 " +
              (tab === key ? "bg-acc text-on-acc font-medium" : "text-mut hover:text-fg")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="w-8 text-xs text-mut">연도</span>
        {years.map((y) => (
          <button
            key={y}
            onClick={() => changeYear(y)}
            className={
              "rounded-full px-3 py-1 text-xs " +
              (year === y ? "bg-acc text-on-acc" : "border border-line text-mut hover:text-fg")
            }
          >
            {y}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4">
        {paged.map((a, i) => (
          <div key={a.id} className="flex items-center gap-3">
            <span className="w-6 shrink-0 text-center text-sm font-bold text-mut">
              {(safePage - 1) * PAGE_SIZE + i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <AlbumRatingCard album={a} />
            </div>
          </div>
        ))}
      </div>
      {shown.length === 0 && <p className="mt-6 text-sm text-mut">해당 조건의 앨범이 없습니다.</p>}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded-full border border-line px-3 py-1.5 disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-mut">
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded-full border border-line px-3 py-1.5 disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
