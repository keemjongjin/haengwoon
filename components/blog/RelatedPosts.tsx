"use client";

import { useState } from "react";
import type { PostMeta } from "@/lib/content/posts";
import { PostTitleRow } from "./PostTitleRow";

// PostList.tsx의 카테고리 탭 페이지네이션과 같은 방식(5개씩 이전/다음) — 위젯이 다른 자리에
// 있을 뿐 같은 상호작용이라 굳이 다르게 만들지 않았다.
const PAGE_SIZE = 5;

/**
 * 글 상세의 "관련 글" 섹션. 후보 목록은 서버(getRelatedPosts)가 이미 정렬해서 넘겨주고,
 * 이 컴포넌트는 5개씩 잘라 보여주는 페이지네이션만 담당한다 — series 글이면 정렬은
 * 오래된순(연재 읽는 순서), category 폴백이면 최신순이지만 이 컴포넌트 입장에선 둘 다
 * 그냥 "이미 정렬된 배열"이라 구분할 필요가 없다.
 */
export function RelatedPosts({ posts, heading }: { posts: PostMeta[]; heading: string }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = posts.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section className="mt-16 border-t border-line pt-8">
      <h2 className="mb-4 text-sm font-medium text-mut">{heading}</h2>
      <ul>
        {shown.map((p) => (
          <li key={p.slug} className="border-b border-line py-4">
            <PostTitleRow post={p} />
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
    </section>
  );
}
