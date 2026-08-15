import Link from "next/link";
import type { PostMeta } from "@/lib/content/posts";
import { formatDate } from "@/lib/format";

/**
 * 글 목록 한 줄 — 제목 + 날짜만. 원래 홈(Recent Posts)에서만 쓰던 마크업인데, 프로젝트
 * 상세의 "관련 글"도 같은 모양으로 통일해달라는 요청으로 여기로 뺐다. PostExcerptItem과
 * 같은 이유 — 마크업을 두 파일에 각각 복사해두면 한쪽만 스타일이 바뀌었을 때 갈라진다.
 */
export function PostTitleRow({ post }: { post: PostMeta }) {
  return (
    <Link href={`/posts/${post.slug}`} className="group flex justify-between gap-4">
      <span className="font-medium group-hover:text-acc">{post.title}</span>
      <span className="shrink-0 text-sm text-mut">{formatDate(post.pubDate)}</span>
    </Link>
  );
}
