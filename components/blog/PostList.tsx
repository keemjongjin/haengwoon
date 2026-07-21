"use client";

import Link from "next/link";
import { useState } from "react";
import type { PostMeta } from "@/lib/posts";
import { formatDate } from "@/lib/format";

// 발췌형 목록 + 카테고리 필터 탭 (jeong-min.com /posts 스타일)
const PAGE_SIZE = 5;

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

      <ul>
        {shown.map((p) => (
          <li key={p.slug} className="border-b border-line py-5">
            <Link href={`/posts/${p.slug}`} className="block group">
              <h3 className="text-lg font-semibold group-hover:text-acc">{p.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-mut">
                {p.description}
              </p>
              <div className="mt-3 flex justify-between text-xs text-mut">
                <span>
                  {formatDate(p.pubDate)} · {p.readingMinutes}분
                </span>
                <span className="text-acc">{p.category}</span>
              </div>
            </Link>
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
