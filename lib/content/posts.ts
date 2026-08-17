// Tech 블로그 글 로더. 글 본문은 DB가 아니라 content/posts/*.mdx 파일이 원본(git으로 관리·배포)
// — 이 파일은 그 .mdx들을 읽어 frontmatter를 파싱하고 목록/상세 데이터를 만든다. "노출 여부"만
// post_visibility 테이블(lib/db/schema.ts)에 오버레이돼 있어 getVisiblePosts()에서 DB 조회가 섞인다.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { repo } from "@/lib/db/repo";
import { extractToc, type TocItem } from "./toc";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

/** 목록/카드에 필요한 글 메타데이터(frontmatter + 파생 필드). 본문(content)은 제외. */
export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  updatedDate?: string;
  heroImage?: string;
  category: string;
  tags: string[];
  /** 프론트매터 series — 같은 값이면 한 시리즈(예: 프로젝트 개발기 연재). 없으면 독립 글. */
  series?: string;
};

/** 상세 페이지에서 쓰는 전체 글 데이터: 메타 + 원문 마크다운 + 목차. */
export type Post = PostMeta & { content: string; toc: TocItem[] };

function readFile(slug: string) {
  const raw = fs.readFileSync(path.join(POSTS_DIR, `${slug}.mdx`), "utf-8");
  return matter(raw);
}

function toMeta(slug: string): PostMeta {
  const { data } = readFile(slug);
  return {
    slug,
    title: data.title,
    description: data.description,
    pubDate: String(data.pubDate),
    updatedDate: data.updatedDate ? String(data.updatedDate) : undefined,
    heroImage: data.heroImage,
    category: data.category,
    tags: data.tags ?? [],
    series: data.series || undefined,
  };
}

/** content/posts/*.mdx 디렉터리를 스캔해 slug 목록만 반환(파일이 곧 slug). */
export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

/** 숨김 여부와 무관하게 전체 글 메타데이터를 최신순(pubDate 내림차순)으로 반환. */
export function getAllPosts(): PostMeta[] {
  return getAllPostSlugs()
    .map(toMeta)
    .sort((a, b) => (a.pubDate < b.pubDate ? 1 : -1));
}

// 공개 노출용 — 관리자가 숨긴 글(post_visibility)은 제외. 콘텐츠 자체는 여전히 git이 원본.
/** 공개 목록/RSS 등에서 쓰는 버전 — {@link getAllPosts}에서 관리자가 숨긴 글만 걸러낸다. */
export async function getVisiblePosts(): Promise<PostMeta[]> {
  const hidden = await repo.getHiddenSlugs();
  return getAllPosts().filter((p) => !hidden.has(p.slug));
}

/** 현재 존재하는 글들의 category 값을 중복 제거해서 반환 (필터 UI용). */
export function getCategories(): string[] {
  return Array.from(new Set(getAllPosts().map((p) => p.category)));
}

/**
 * 슬러그 목록에 해당하는 글 메타데이터를 넘겨준 순서 그대로 반환한다.
 * "관련 글"처럼 다른 콘텐츠(프로젝트 등)가 특정 글을 콕 집어 참조할 때 쓴다.
 * 슬러그가 실존하지 않으면(오타·삭제된 글) 조용히 건너뛴다 — 죽은 링크를 렌더하는 것보다
 * 관련 글 개수가 하나 줄어드는 편이 낫다.
 */
export function getPostsBySlugs(slugs: string[]): PostMeta[] {
  const all = new Map(getAllPosts().map((p) => [p.slug, p]));
  return slugs.map((s) => all.get(s)).filter((p): p is PostMeta => p !== undefined);
}

/**
 * 글 상세의 "관련 글" 후보를 정한다.
 * - series가 있으면: 같은 시리즈의 다른 글을 발행일 **오름차순**(오래된 순)으로 — 연재를
 *   순서대로 읽는 느낌. 새 편을 추가할 때 이 글 저 글 돌아다니며 편집할 필요가 없다, series
 *   값만 맞으면 자동으로 묶인다.
 * - series가 없으면(개념 설명·논문 분석처럼 독립적인 글): 같은 category의 다른 글을
 *   발행일 **내림차순**(최신 순) — getAllPosts()가 이미 그 순서라 별도 정렬 없이 그대로 쓴다.
 *   /posts 목록의 카테고리 탭과 같은 정렬이라 "그 카테고리를 더 둘러본다"는 느낌과 맞는다.
 */
export function getRelatedPosts(post: PostMeta): PostMeta[] {
  const others = getAllPosts().filter((p) => p.slug !== post.slug);
  if (post.series) {
    return others
      .filter((p) => p.series === post.series)
      .sort((a, b) => (a.pubDate > b.pubDate ? 1 : a.pubDate < b.pubDate ? -1 : 0));
  }
  return others.filter((p) => p.category === post.category);
}

/** 상세 페이지용 — 메타데이터에 원문 마크다운과 목차를 더해 반환. */
export function getPost(slug: string): Post {
  const { content } = readFile(slug);
  return { ...toMeta(slug), content, toc: extractToc(content) };
}
