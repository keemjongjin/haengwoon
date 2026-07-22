import type { TocItem } from "@/lib/posts";

// 글 목차 (ToC). 헤딩 앵커로 이동.
export function Toc({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="목차" className="mb-8 rounded-xl border border-line p-4 text-sm xl:hidden">
      <p className="mb-2 font-medium text-mut">목차</p>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.slug} style={{ paddingLeft: (it.depth - 2) * 12 }}>
            <a href={`#${it.slug}`} className="text-mut hover:text-acc">
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
