"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/format";
import { PostVisibilityToggle } from "./PostVisibilityToggle";

export type PostListItem = { slug: string; title: string; category: string; pubDate: string };

const PAGE_SIZE = 10;

export function PostsList({ posts, hiddenSlugs }: { posts: PostListItem[]; hiddenSlugs: string[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const hiddenSet = useMemo(() => new Set(hiddenSlugs), [hiddenSlugs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [posts, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleQueryChange(v: string) {
    setQuery(v);
    setPage(1);
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-mut">현재 글 ({posts.length})</h3>
      <input
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="제목 또는 카테고리 검색"
        className="mb-3 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-acc"
      />
      <ul>
        {paged.map((p) => (
          <li key={p.slug} className="flex items-center gap-4 border-b border-line py-3 text-sm">
            <span className="flex-1 font-medium">{p.title}</span>
            <span className="text-xs text-acc">{p.category}</span>
            <span className="text-xs text-mut">{formatDate(p.pubDate)}</span>
            <PostVisibilityToggle slug={p.slug} initialHidden={hiddenSet.has(p.slug)} />
          </li>
        ))}
      </ul>
      {filtered.length === 0 && <p className="py-4 text-sm text-mut">검색 결과가 없습니다.</p>}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
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
