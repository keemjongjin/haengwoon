"use client";

import { useEffect, useMemo, useState } from "react";
import { AlbumRatingCard, type AlbumCardData } from "./AlbumRatingCard";

export type MusicSearchItem = AlbumCardData & { trackTitles: string[] };

const PAGE_SIZE = 10;

// /music/search 전용 검색 페이지. Tech의 /search와 대칭 구조 — 앨범 제목·수록곡·아티스트명 매칭.
export function MusicSearch({ index }: { index: MusicSearchItem[] }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return index
      .filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.artist.toLowerCase().includes(query) ||
          a.trackTitles.some((t) => t.toLowerCase().includes(query))
      )
      .sort((a, b) => (b.manualRating ?? 0) - (a.manualRating ?? 0));
  }, [q, index]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [q]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="앨범, 수록곡, 아티스트 검색"
        autoFocus
        className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-acc"
      />

      {q.trim() && <p className="mt-4 mb-4 text-sm text-mut">{results.length}개 결과</p>}

      <div className="grid grid-cols-1 gap-4">
        {paged.map((a) => (
          <AlbumRatingCard key={a.id} album={a} />
        ))}
      </div>
      {q.trim() && results.length === 0 && (
        <p className="text-sm text-mut">검색 결과가 없습니다.</p>
      )}

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
