import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { formatDate } from "@/lib/format";

export default function TechHome() {
  const recent = getAllPosts().slice(0, 5);

  return (
    <div>
      <h1 className="text-3xl font-semibold leading-relaxed">
        안녕하세요!
        <br />
        <span className="text-acc">Frontend</span>를 좋아하는 개발자 jongjin입니다.
      </h1>

      <section className="mt-12">
        <h2 className="mb-2 text-sm font-medium text-mut">Recent Posts</h2>
        <ul>
          {recent.map((p) => (
            <li key={p.slug} className="border-b border-line py-4">
              <Link href={`/posts/${p.slug}`} className="flex justify-between gap-4 group">
                <span className="font-medium group-hover:text-acc">{p.title}</span>
                <span className="shrink-0 text-sm text-mut">{formatDate(p.pubDate)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
