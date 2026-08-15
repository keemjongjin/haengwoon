"use client";

import { useState } from "react";
import type { PostMeta } from "@/lib/content/posts";
import { PostExcerptItem } from "./PostExcerptItem";

// 발췌형 목록 + 카테고리 필터 탭 (jeong-min.com /posts 스타일)
const PAGE_SIZE = 5;

/** Tech 블로그 /posts 목록 — 카테고리 탭 필터 + 발췌 카드 + 페이지네이션(5개씩). */
export function PostList({
  posts,
  categories,
}: {
  posts: PostMeta[];
  categories: string[];
}) {
  const [active, setActive] = useState("All");
  const [page, setPage] = useState(1);
  const tabs = ["All", ...categories];
  const filtered = active === "All" ? posts : posts.filter((p) => p.category === active);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function selectCategory(t: string) {
    setActive(t);
    setPage(1);
  }

  return (
    <div>
      <div className="flex gap-5 border-b border-line text-sm">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => selectCategory(t)}
            className={
              "pb-2 " +
              (active === t
                ? "text-fg font-medium border-b-2 border-acc"
                : "text-mut hover:text-fg")
            }
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {shown.map((p) => (
          <li key={p.slug}>
            <PostExcerptItem post={p} />
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            onClick={() => setPage(current - 1)}
            disabled={current <= 1}
            className="text-mut hover:text-fg disabled:opacity-30"
          >
            ← 이전
          </button>
          <span className="text-mut">
            {current} / {totalPages}
          </span>
          <button
            onClick={() => setPage(current + 1)}
            disabled={current >= totalPages}
            className="text-mut hover:text-fg disabled:opacity-30"
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
