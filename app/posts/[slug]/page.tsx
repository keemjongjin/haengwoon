import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPostSlugs, getPost, getPostsBySlugs } from "@/lib/content/posts";
import { mdxOptions, mdxComponents } from "@/lib/content/mdx";
import { formatDate } from "@/lib/format";
import { Toc } from "@/components/blog/Toc";
import { TocFloating } from "@/components/blog/TocFloating";
import { PostTitleRow } from "@/components/blog/PostTitleRow";
import { Comments } from "@/components/features/Comments";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/security/auth";

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const post = getPost(slug);
    return { title: `${post.title} — Haengwoon`, description: post.description };
  } catch {
    return {};
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getAllPostSlugs().includes(slug)) notFound();
  const hidden = await repo.getHiddenSlugs();
  if (hidden.has(slug) && !(await isAdmin())) notFound();
  const post = getPost(slug);

  // 관련 글은 프론트매터 relatedSlugs로 직접 지정한다(글 자신은 스스로 참조하지 않도록 제외).
  // 프로젝트 상세의 "관련 글"과 같은 이유로 숨김 글은 비관리자에게 걸러낸다 — 위에서 이미
  // 구한 hidden을 그대로 재사용(현재 글 자체의 숨김 판정에 쓴 것과 같은 조회).
  let relatedPosts = getPostsBySlugs(post.relatedSlugs.filter((s) => s !== slug));
  if (relatedPosts.length > 0 && !(await isAdmin())) {
    relatedPosts = relatedPosts.filter((p) => !hidden.has(p.slug));
  }

  return (
    <article>
      <header className="mb-8 text-center">
        <div className="mb-2 text-sm text-mut">{formatDate(post.pubDate)}</div>
        <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
        {post.tags.length > 0 && (
          <div className="mt-4 flex justify-center gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-card px-3 py-1 text-xs text-mut"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <Toc items={post.toc} />
      <TocFloating items={post.toc} />

      <div className="article">
        <MDXRemote source={post.content} options={mdxOptions} components={mdxComponents} />
      </div>

      {relatedPosts.length > 0 && (
        <section className="mt-16 border-t border-line pt-8">
          <h2 className="mb-4 text-sm font-medium text-mut">관련 글</h2>
          <ul>
            {relatedPosts.map((p) => (
              <li key={p.slug} className="border-b border-line py-4">
                <PostTitleRow post={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 border-t border-line pt-8">
        <h2 className="mb-4 text-sm font-medium text-mut">댓글</h2>
        <Comments />
      </section>
    </article>
  );
}
