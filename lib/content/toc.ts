// 마크다운 본문에서 ##/### 헤딩만 뽑아 목차(TOC)를 만든다.
// Posts와 Projects 상세 페이지가 동일한 형식(##/### 헤딩)을 쓰므로 이 로직을 공유한다.
import GithubSlugger from "github-slugger";

/** 상세 페이지 목차(TOC) 한 줄 — depth 2/3(##/###)만 뽑는다. */
export type TocItem = { depth: number; text: string; slug: string };

// rehype-slug와 동일한 github-slugger를 써야 여기서 만든 슬러그가 실제 렌더된 헤딩의 id와
// 일치한다(mdxOptions에 rehype-slug가 걸려 있음 — lib/content/mdx.ts).
export function extractToc(content: string): TocItem[] {
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
