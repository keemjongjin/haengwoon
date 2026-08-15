// 포트폴리오 프로젝트 로더.
//
// posts.ts와 달리 메타데이터를 mdx 프론트매터가 아니라 이 파일의 PROJECTS 배열에 직접 둔다.
// 이유: 지금은 프로젝트가 한 개뿐이고 당분간도 몇 개 수준이라, 파일마다 프론트매터를 관리하는
// 계층을 유지할 이유가 적다. 카드용 필드(techStack·thumbnailUrl·외부 링크)가 많아지면서
// 오히려 타입이 있는 배열 쪽이 실수하기 어렵다(frontmatter는 오타·누락이 조용히 통과된다).
//
// 본문(트러블슈팅·아키텍처 같은 긴 서술)은 여전히 content/projects/*.mdx 파일에 남는다 —
// 카드 요약과 장문 서술은 관리 빈도가 다르므로 억지로 한곳에 합치지 않는다.
// 두 출처가 겹치는 필드(title·description 등)를 두면 어긋나기 쉬우므로, mdx 쪽 프론트매터는
// 쓰지 않는다 — 이 배열이 유일한 출처.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { extractToc, type TocItem } from "./toc";

const DIR = path.join(process.cwd(), "content", "projects");

export type ProjectLinks = {
  post?: string;
  github?: string;
  demo?: string;
  googlePlay?: string;
  appStore?: string;
};

/** 목록 카드에 필요한 프로젝트 메타데이터. */
export type ProjectMeta = {
  slug: string; // /projects/[slug] 라우팅 + content/projects/{slug}.mdx 매칭에 그대로 쓰인다
  title: string;
  description: string;
  techStack: string[];
  /** public/ 기준 경로(예: "/projects/haengwoon.png"). 없으면 카드에 이니셜 플레이스홀더. */
  thumbnailUrl?: string;
  pubDate: string;
  links?: ProjectLinks;
  /** content/posts/*.mdx 슬러그. 이 프로젝트를 만들며 쓴 개발기 등을 직접 골라 연결한다. */
  relatedPostSlugs?: string[];
};

/** 새 프로젝트는 이 배열에 한 항목 추가 + content/projects/{slug}.mdx 본문 작성으로 끝난다. */
const PROJECTS: ProjectMeta[] = [
  {
    slug: "2026-haengwoon",
    title: "개인 포트폴리오 및 음악 아카이브 플랫폼",
    description: "기술 블로그와 음악 아카이브를 결합한 개인 포트폴리오 플랫폼.",
    techStack: ["Next.js", "TypeScript", "Drizzle", "Neon"],
    thumbnailUrl: "",
    pubDate: "2026-07-17",
    links: {
      github: "https://github.com/keemjongjin/haengwoon",
      demo: "https://haengwoon.vercel.app/",
    },
    relatedPostSlugs: ["260717-dev-haengwoon01"],
  },
];

/** 상세 페이지용 — 메타데이터 + 원문 마크다운 + 목차. */
export type Project = ProjectMeta & { content: string; toc: TocItem[] };

/** 전체 프로젝트 메타데이터를 최신순(pubDate 내림차순)으로 반환. */
export function getAllProjects(): ProjectMeta[] {
  return [...PROJECTS].sort((a, b) => (a.pubDate < b.pubDate ? 1 : -1));
}

/** content/projects/*.mdx 라우팅용 slug 목록 — 이제 파일 스캔이 아니라 PROJECTS가 기준이다. */
export function getAllProjectSlugs(): string[] {
  return PROJECTS.map((p) => p.slug);
}

/**
 * 상세 페이지용 — 메타데이터(PROJECTS)에 mdx 본문과 목차를 더해 반환.
 * mdx 프론트매터는 읽지 않는다(gray-matter는 파일 앞의 `---` 블록을 건너뛰기 위해서만 쓴다) —
 * title 등은 PROJECTS가 유일한 출처라 프론트매터에 남아 있어도 무시된다.
 */
export function getProject(slug: string): Project {
  const meta = PROJECTS.find((p) => p.slug === slug);
  if (!meta) throw new Error(`project not found: ${slug}`);
  const raw = fs.readFileSync(path.join(DIR, `${slug}.mdx`), "utf-8");
  const { content } = matter(raw);
  return { ...meta, content, toc: extractToc(content) };
}
