import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllProjectSlugs, getProject } from "@/lib/content/projects";
import { mdxOptions } from "@/lib/content/mdx";
import { formatDate } from "@/lib/format";
import { Toc } from "@/components/blog/Toc";
import { TocFloating } from "@/components/blog/TocFloating";
import { Comments } from "@/components/features/Comments";

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
        <MDXRemote source={project.content} options={mdxOptions} />
      </div>

      {/* term 없이 pathname 매핑 — 글 댓글과 동일하게 프로젝트별로 별도 스레드가 생긴다 */}
      <section className="mt-16 border-t border-line pt-8">
        <h2 className="mb-4 text-sm font-medium text-mut">댓글</h2>
        <Comments />
      </section>
    </article>
  );
}
