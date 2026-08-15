import { getVisiblePosts } from "@/lib/content/posts";
import { PostTitleRow } from "@/components/blog/PostTitleRow";

export const dynamic = "force-dynamic"; // 숨김 여부는 DB 조회 → 매 요청 최신화

export default async function TechHome() {
  const recent = (await getVisiblePosts()).slice(0, 5);

  return (
    <div>
      <h1 className="text-3xl font-semibold leading-relaxed">
        안녕하세요! 개발자 김종진입니다.
      </h1>

      <section className="mt-12">
        <h2 className="mb-2 text-sm font-medium text-mut">Recent Posts</h2>
        <ul>
          {recent.map((p) => (
            <li key={p.slug} className="border-b border-line py-4">
              <PostTitleRow post={p} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
