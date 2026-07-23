"use client";

import { useMemo, useState } from "react";
import { AlbumRatingCard } from "./AlbumRatingCard";

export type ArchiveAlbum = {
  id: number;
  spotifyAlbumId?: string | null;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  albumType?: string | null;
  genre: string | null;
  reviewDate: string | null;
  releaseDate: string | null;
  manualRating: number | null;
  review?: string | null;
  likeCount?: number;
  favoriteTrack?: { id: number; title: string; previewUrl?: string | null } | null;
};

type Basis = "review" | "release" | "rating" | "likes";
type Dir = "desc" | "asc";
const PAGE_SIZE = 10;

// 리뷰일/발매일만 오름·내림 방향을 고를 수 있음(날짜 기준). 평점·좋아요는 항상 높은 순.
function isDateBasis(b: Basis): boolean {
  return b === "review" || b === "release";
}

function yearOf(d: string | null): string {
  return d ? d.slice(0, 4) : "?";
}

export function ArchiveFilters({
  albums,
  initialGenre,
}: {
  albums: ArchiveAlbum[];
  initialGenre?: string;
}) {
  const [basis, setBasis] = useState<Basis>("review");
  const [sortDir, setSortDir] = useState<Dir>("desc");
  const [year, setYear] = useState("전체");
  const [genre, setGenre] = useState(initialGenre || "전체");
  const [page, setPage] = useState(1);

  // 연도 필터는 항상 적용됨 — 발매일 기준일 땐 releaseDate, 그 외(리뷰일/평점순/좋아요순)엔 reviewDate를 쓴다.
  const dateOf = (a: ArchiveAlbum) => (basis === "release" ? a.releaseDate : a.reviewDate);

  const years = useMemo(
    () =>
      ["전체", ...Array.from(new Set(albums.map((a) => yearOf(dateOf(a))))).sort().reverse()],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [albums, basis]
  );
  const genres = useMemo(
    () => ["전체", ...Array.from(new Set(albums.map((a) => a.genre).filter(Boolean) as string[]))],
    [albums]
  );

  const shown = albums
    .filter(
      (a) =>
        (year === "전체" || yearOf(dateOf(a)) === year) &&
        (genre === "전체" || a.genre === genre)
    )
    .sort((a, b) => {
      if (basis === "rating") return (b.manualRating ?? 0) - (a.manualRating ?? 0);
      if (basis === "likes") return (b.likeCount ?? 0) - (a.likeCount ?? 0);
      const da = dateOf(a) ?? "";
      const db = dateOf(b) ?? "";
      const cmp = da < db ? 1 : da > db ? -1 : 0; // 기본: 최신 먼저(내림차순)
      return sortDir === "desc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = shown.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changeBasis(b: Basis) {
    setPage(1);
    // 이미 활성화된 날짜 기준을 다시 누르면 오름/내림 방향 토글, 아니면 기준 전환(기본 내림차순)
    if (b === basis && isDateBasis(b)) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
      return;
    }
    setBasis(b);
    setSortDir("desc");
    setYear("전체"); // 기준 바뀌면 연도 초기화
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
      {/* 기준 토글: 리뷰일 / 발매일 / 평점순 / 좋아요순 */}
      <div className="mb-4 inline-flex flex-wrap rounded-full border border-line p-1 text-xs">
        {(
          [
            ["review", "내 리뷰일 기준"],
            ["release", "앨범 발매일 기준"],
            ["rating", "평점순"],
            ["likes", "좋아요순"],
          ] as [Basis, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => changeBasis(key)}
            aria-label={
              isDateBasis(key)
                ? `${label} (${basis === key && sortDir === "asc" ? "오름차순" : "내림차순"})`
                : label
            }
            className={
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 " +
              (basis === key ? "bg-acc text-on-acc font-medium" : "text-mut hover:text-fg")
            }
          >
            {label}
            {isDateBasis(key) && (
              <span aria-hidden="true" className="text-[10px] leading-none">
                {basis === key && sortDir === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
        ))}
      </div>

      <FilterRow label="연도" options={years} value={year} onChange={changeYear} />
      <FilterRow label="장르" options={genres} value={genre} onChange={changeGenre} />

      <div className="mt-6 grid grid-cols-1 gap-4">
        {paged.map((a) => (
          <AlbumRatingCard key={a.id} album={a} />
        ))}
      </div>
      {shown.length === 0 && <p className="mt-6 text-sm text-mut">해당 조건의 앨범이 없습니다.</p>}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="rounded-full border border-line px-3 py-1.5 disabled:opacity-30"
          >
            이전
          </button>
          <span className="text-mut">
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
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

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="w-8 text-xs text-mut">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={
            "rounded-full px-3 py-1 text-xs " +
            (value === o ? "bg-acc text-on-acc" : "border border-line text-mut hover:text-fg")
          }
        >
          {o}
        </button>
      ))}
    </div>
  );
}
