import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllProjectSlugs, getProject } from "@/lib/content/projects";
import { getPostsBySeries } from "@/lib/content/posts";
import { mdxOptions, mdxComponents } from "@/lib/content/mdx";
import { formatDate } from "@/lib/format";
import { Toc } from "@/components/blog/Toc";
import { TocFloating } from "@/components/blog/TocFloating";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { Comments } from "@/components/features/Comments";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/security/auth";

export function generateStaticParams() {
  return getAllProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const p = getProject(slug);
    return { title: `${p.title} — Haengwoon`, description: p.description };
  } catch {
    return {};
  }
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getAllProjectSlugs().includes(slug)) notFound();
  const project = getProject(slug);

  // 관련 글은 project.series와 같은 series 값을 가진 글을 자동으로 모은다(posts.ts의
  // getPostsBySeries — 글 상세의 시리즈 묶음과 같은 함수). 숨김(post_visibility) 처리된
  // 글은 관리자가 아니면 걸러낸다 — 그대로 두면 목록엔 안 보이는 글을 여기서만 볼 수 있게
  // 되고, 클릭하면 /posts/[slug]가 어차피 404를 낸다(그 라우트는 숨김 글을 비관리자에게
  // 따로 차단한다).
  let relatedPosts = project.series ? getPostsBySeries(project.series) : [];
  if (relatedPosts.length > 0) {
    const [hidden, admin] = await Promise.all([repo.getHiddenSlugs(), isAdmin()]);
    if (!admin) relatedPosts = relatedPosts.filter((p) => !hidden.has(p.slug));
  }

  return (
    <article>
      <header className="mb-8">
        <div className="mb-2 text-sm text-mut">{formatDate(project.pubDate)}</div>
        <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {project.techStack.map((t) => (
            <span key={t} className="text-sm text-acc">
              #{t}
            </span>
          ))}
        </div>
      </header>

      <Toc items={project.toc} />
      <TocFloating items={project.toc} />

      <div className="article">
        <MDXRemote source={project.content} options={mdxOptions} components={mdxComponents} />
      </div>

      {/* 글 상세와 같은 컴포넌트(RelatedPosts) — 마크업을 복사해두면 한쪽만 스타일이
          바뀌었을 때 모양이 갈라진다(실제로 그랬다). */}
      {relatedPosts.length > 0 && (
        <RelatedPosts posts={relatedPosts} heading={`${project.series} 시리즈`} />
      )}

      {/* term 없이 pathname 매핑 — 글 댓글과 동일하게 프로젝트별로 별도 스레드가 생긴다 */}
      <section className="mt-16 border-t border-line pt-8">
        <h2 className="mb-4 text-sm font-medium text-mut">댓글</h2>
        <Comments />
      </section>
    </article>
  );
}
