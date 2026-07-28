// 포트폴리오 프로젝트 글 로더. content/projects/*.mdx가 원본이고 DB 개입이 없다는 점만 빼면
// posts.ts와 동일한 패턴(frontmatter 파싱 → 메타/상세 분리) — 숨김 기능이 없어 더 단순하다.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content", "projects");

/** 목록 카드에 필요한 프로젝트 메타데이터(frontmatter). 본문(content)은 제외. */
export type ProjectMeta = {
  slug: string;
  title: string;
  description: string;
  pubDate: string;
  heroImage?: string;
  tags: string[];
};

/** 상세 페이지용 — 메타데이터 + 원문 마크다운. */
export type Project = ProjectMeta & { content: string };

function read(slug: string) {
  return matter(fs.readFileSync(path.join(DIR, `${slug}.mdx`), "utf-8"));
}

function toMeta(slug: string): ProjectMeta {
  const { data } = read(slug);
  return {
    slug,
    title: data.title,
    description: data.description,
    pubDate: String(data.pubDate),
    heroImage: data.heroImage,
    tags: data.tags ?? [],
  };
}

/** content/projects/*.mdx 디렉터리를 스캔해 slug 목록만 반환(파일이 곧 slug). */
export function getAllProjectSlugs(): string[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

/** 전체 프로젝트 메타데이터를 최신순(pubDate 내림차순)으로 반환. */
export function getAllProjects(): ProjectMeta[] {
  return getAllProjectSlugs()
    .map(toMeta)
    .sort((a, b) => (a.pubDate < b.pubDate ? 1 : -1));
}

/** 상세 페이지용 — 메타데이터에 원문 마크다운을 더해 반환. */
export function getProject(slug: string): Project {
  const { content } = read(slug);
  return { ...toMeta(slug), content };
}
