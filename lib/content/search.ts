// Tech 블로그(/search)용 검색 인덱스. 음악 쪽 검색(앨범·아티스트·수록곡)은 이 파일이 아니라
// lib/music/musicSearchIndex.ts가 별도로 담당한다 — 완전히 다른 콘텐츠 소스(파일 vs DB)라서 분리됨.
import { getAllPostSlugs, getPost } from "./posts";

/** 검색 결과 한 건 — 마크다운 문법을 제거한 평문 본문(text)까지 포함한 형태. */
export type SearchRecord = {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  text: string;
};

// 빌드타임에 포스트 본문을 평문화한 검색 인덱스 생성.
// (규모가 커지면 Pagefind 등 정적 인덱서로 교체 가능)
/** 전체 글을 돌며 코드블록·마크다운 기호를 제거한 검색용 평문 인덱스를 만든다. */
export function getSearchRecords(): SearchRecord[] {
  return getAllPostSlugs().map((slug) => {
    const p = getPost(slug);
    const text = p.content
      .replace(/```[\s\S]*?```/g, " ") // 코드블록 제거
      .replace(/[#>*_`~\-\[\]()]/g, " ") // 마크다운 기호 제거
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);
    return {
      slug: p.slug,
      title: p.title,
      description: p.description,
      category: p.category,
      tags: p.tags,
      text,
    };
  });
}
