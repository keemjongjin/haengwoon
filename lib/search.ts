import { getAllPostSlugs, getPost } from "./posts";

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
