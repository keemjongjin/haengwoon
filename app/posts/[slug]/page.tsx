import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPostSlugs, getPost } from "@/lib/posts";
import { mdxOptions } from "@/lib/mdx";
import { formatDate } from "@/lib/format";
import { Toc } from "@/components/blog/Toc";
import { Comments } from "@/components/features/Comments";

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
  const post = getPost(slug);

  return (
    <article>
      <header className="mb-8 text-center">
        <div className="mb-2 text-sm text-mut">
          {formatDate(post.pubDate)} · {post.readingMinutes}분 읽기
        </div>
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

      <div className="article">
        <MDXRemote source={post.content} options={mdxOptions} />
      </div>

      <Comments />
    </article>
  );
}
