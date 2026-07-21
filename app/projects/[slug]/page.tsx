import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllProjectSlugs, getProject } from "@/lib/projects";
import { mdxOptions } from "@/lib/mdx";
import { formatDate } from "@/lib/format";

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
          {project.tags.map((t) => (
            <span key={t} className="text-sm text-acc">
              #{t}
            </span>
          ))}
        </div>
      </header>

      <div className="article">
        <MDXRemote source={project.content} options={mdxOptions} />
      </div>
    </article>
  );
}
