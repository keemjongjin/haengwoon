"use client";

// /music/charts 페이지 본체. "평점 랭킹"과 "취향 대결(Elo)" 두 탭을 전환하면서 같은 행 컴포넌트를
// 재사용 — Elo 탭에서는 표시용으로 eloScore10을 rating 자리에 끼워 넣어(아래 .map 참고)
// ChartAlbumRow가 두 지표를 구분할 필요 없이 그대로 렌더링하게 만든다.
import { useMemo, useState } from "react";
import { ChartAlbumRow } from "./ChartAlbumRow";
import { FilterRow } from "./FilterRow";

/** ChartsFilters에 넘기는 앨범 데이터 — 평점(manualRating)과 Elo(eloScore10)를 둘 다 들고 있다. */
export type ChartAlbum = {
  id: number;
  spotifyAlbumId: string | null;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  albumType?: string | null;
  genre: string | null;
  reviewDate: string | null;
  manualRating: number | null;
  eloScore10: number;
  review?: string | null;
  favoriteTrack?: { id: number; title: string; previewUrl?: string | null } | null;
};

type Tab = "rating" | "elo";
const PAGE_SIZE = 20;

function yearOf(d: string | null): string {
  return d ? d.slice(0, 4) : "?";
}

/** 평점/Elo 탭 전환 + 연도·장르 필터 + 순위 매긴 앨범 행 목록(페이지네이션 포함). */
export function ChartsFilters({ albums }: { albums: ChartAlbum[] }) {
  const [tab, setTab] = useState<Tab>("rating");
  const [year, setYear] = useState("전체");
  const [genre, setGenre] = useState("전체");
  const [page, setPage] = useState(1);

  const years = useMemo(
    () => ["전체", ...Array.from(new Set(albums.map((a) => yearOf(a.reviewDate)))).sort().reverse()],
    [albums]
  );
  const genres = useMemo(
    () => ["전체", ...Array.from(new Set(albums.map((a) => a.genre).filter(Boolean) as string[]))],
    [albums]
  );

  const shown = albums
    .filter(
      (a) =>
        (year === "전체" || yearOf(a.reviewDate) === year) && (genre === "전체" || a.genre === genre)
    )
    .sort((a, b) =>
      tab === "rating" ? (b.manualRating ?? 0) - (a.manualRating ?? 0) : b.eloScore10 - a.eloScore10
    )
    .map((a) => ({
      ...a,
      rating: tab === "rating" ? a.manualRating : a.eloScore10,
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

  function changeGenre(g: string) {
    setGenre(g);
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

      <FilterRow label="연도" options={years} value={year} onChange={changeYear} />
      <FilterRow label="장르" options={genres} value={genre} onChange={changeGenre} />

      <div className="mt-6 grid grid-cols-1 gap-4">
        {paged.map((a, i) => (
          <div key={a.id} className="flex items-center gap-3">
            <span className="w-6 shrink-0 text-center text-sm font-bold text-mut">
              {(safePage - 1) * PAGE_SIZE + i + 1}
            </span>
            <ChartAlbumRow album={a} />
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
