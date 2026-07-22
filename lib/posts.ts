import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";
import GithubSlugger from "github-slugger";
import { repo } from "@/lib/db/repo";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  updatedDate?: string;
  heroImage?: string;
  category: string;
  tags: string[];
  readingMinutes: number;
};

export type TocItem = { depth: number; text: string; slug: string };

export type Post = PostMeta & { content: string; toc: TocItem[] };

function readFile(slug: string) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, `${slug}.mdx`), "utf-8");
  return matter(raw);
}

function toMeta(slug: string): PostMeta {
  const { data, content } = readFile(slug);
  return {
    slug,
    title: data.title,
    description: data.description,
    pubDate: String(data.pubDate),
    updatedDate: data.updatedDate ? String(data.updatedDate) : undefined,
    heroImage: data.heroImage,
    category: data.category,
    tags: data.tags ?? [],
    readingMinutes: Math.max(1, Math.round(readingTime(content).minutes)),
  };
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export function getAllPosts(): PostMeta[] {
  return getAllPostSlugs()
    .map(toMeta)
    .sort((a, b) => (a.pubDate < b.pubDate ? 1 : -1));
}

// 공개 노출용 — 관리자가 숨긴 글(post_visibility)은 제외. 콘텐츠 자체는 여전히 git이 원본.
export async function getVisiblePosts(): Promise<PostMeta[]> {
  const hidden = await repo.getHiddenSlugs();
  return getAllPosts().filter((p) => !hidden.has(p.slug));
}

export function getCategories(): string[] {
  return Array.from(new Set(getAllPosts().map((p) => p.category)));
}

// ## / ### 헤딩을 뽑아 목차 생성. rehype-slug와 동일한 github-slugger 사용 → 앵커 일치.
function extractToc(content: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  for (const line of content.split("\n")) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (m) {
      const text = m[2].trim();
      items.push({ depth: m[1].length, text, slug: slugger.slug(text) });
    }
  }
  return items;
}

export function getPost(slug: string): Post {
  const { content } = readFile(slug);
  return { ...toMeta(slug), content, toc: extractToc(content) };
}
