"use client";

// /music/archive 페이지 본체. 정렬 기준(리뷰일/발매일/평점/좋아요)·연도·장르 필터와 페이지네이션을
// 클라이언트에서 전부 처리 — 앨범 수가 적어(수백 장 이하) 서버 페이지네이션 없이도 충분하다.
import { useMemo, useState } from "react";
import { AlbumRatingCard } from "./AlbumRatingCard";
import { FilterRow } from "./FilterRow";

/** ArchiveFilters에 넘기는 앨범 데이터 — AlbumCardData에 필터링용 필드(genre/reviewDate 등)를 더함. */
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

/**
 * 이 연도부터는 한 해씩, 그 이전은 10년 단위로 묶는다.
 * 발매일 기준으로 보면 연도가 수십 개로 늘어나 필터 줄이 화면을 몇 줄씩 잡아먹는데,
 * 오래된 앨범일수록 "몇 년도"보다 "어느 연대"로 기억하고 찾는다.
 */
const DECADE_CUTOFF = 2010;

/**
 * 필터에 쓸 구간 이름. groupDecades면 DECADE_CUTOFF 이전을 "1990s"처럼 묶는다.
 * 리뷰일 기준에는 묶지 않는다 — 리뷰는 이 사이트를 만든 뒤로만 쌓여 연도가 몇 개 안 된다.
 */
function bucketOf(d: string | null, groupDecades: boolean): string {
  if (!d) return "?";
  const y = Number(d.slice(0, 4));
  if (!Number.isFinite(y)) return "?";
  if (!groupDecades || y >= DECADE_CUTOFF) return String(y);
  return `${Math.floor(y / 10) * 10}s`;
}

/** 최신이 위로 오도록 정렬할 때 쓰는 값. "2000s" → 2000, 발매일이 없는 "?"는 맨 뒤로. */
function bucketOrder(bucket: string): number {
  return bucket === "?" ? -1 : parseInt(bucket, 10);
}

/** 정렬 기준·연도·장르 필터 툴바 + 필터링된 앨범 카드 목록(페이지네이션 포함). */
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

  // 발매일 기준일 때만 오래된 연도를 10년 단위로 묶는다.
  const groupDecades = basis === "release";

  const years = useMemo(
    () => [
      "전체",
      ...Array.from(new Set(albums.map((a) => bucketOf(dateOf(a), groupDecades)))).sort(
        (a, b) => bucketOrder(b) - bucketOrder(a)
      ),
    ],
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
        (year === "전체" || bucketOf(dateOf(a), groupDecades) === year) &&
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
