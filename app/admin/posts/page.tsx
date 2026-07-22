import { getAllPosts } from "@/lib/posts";
import { repo } from "@/lib/db/repo";
import { PostsList } from "@/components/admin/PostsList";

export const metadata = { title: "Posts — Admin" };
export const dynamic = "force-dynamic";

// 블로그 글은 MD 파일 + git push로 관리 (웹 CRUD 없음). 노출 여부만 DB 오버레이로 전환 가능.
export default async function AdminPostsPage() {
  const posts = getAllPosts();
  const hidden = await repo.getHiddenSlugs();

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">Posts</h2>
      <p className="mb-6 text-sm text-mut">
        블로그 글은 <code className="rounded bg-card px-1.5 py-0.5">content/posts/*.mdx</code> 파일로
        관리합니다. 새 글은 로컬에서 파일을 추가하고 <code className="rounded bg-card px-1.5 py-0.5">git push</code>
        하면 반영돼요.
      </p>

      <div className="mb-8 rounded-xl border border-line bg-card p-4">
        <p className="mb-2 text-xs font-medium text-mut">새 글 프론트매터 템플릿</p>
        <pre className="overflow-x-auto text-xs leading-relaxed">
{`---
title: "글 제목"
description: "목록에 보일 한 줄 요약"
pubDate: "2026-01-01"
category: "Dev"
tags: ["tag1", "tag2"]
---

## 첫 섹션

본문 내용...`}
        </pre>
      </div>

      <PostsList posts={posts} hiddenSlugs={Array.from(hidden)} />
    </div>
  );
}
