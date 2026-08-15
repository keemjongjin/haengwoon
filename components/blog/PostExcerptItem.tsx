import Link from "next/link";
import type { PostMeta } from "@/lib/content/posts";
import { formatDate } from "@/lib/format";

/**
 * 글 목록 발췌 카드 한 줄. /posts 목록(PostList)과 프로젝트 상세의 "관련 글"이 함께 쓴다.
 * 두 화면에 각자 마크업을 복사해뒀다가, 한쪽만 스타일을 바꾸는 바람에 모양이 갈라진 적이
 * 있어서 컴포넌트로 묶었다 — 이제 여기 하나만 고치면 양쪽 다 같이 바뀐다.
 *
 * 호버하면 배경이 옅게 뜬다(hover:bg-card). 테두리로 구분하던 예전 방식은 목록이 길어지면
 * 화면이 선으로 빼곡해 보였는데, 지금은 마우스가 가리키는 한 줄만 은은하게 떠올라 지금 어디를
 * 보고 있는지 더 잘 드러난다.
 */
export function PostExcerptItem({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className="group block rounded-xl p-5 transition-colors hover:bg-card"
    >
      <h3 className="text-lg font-semibold group-hover:text-acc">{post.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-mut">{post.description}</p>
      <div className="mt-3 flex justify-between text-xs text-mut">
        <span>
          {formatDate(post.pubDate)} · {post.readingMinutes}분
        </span>
        <span className="text-acc">{post.category}</span>
      </div>
    </Link>
  );
}
