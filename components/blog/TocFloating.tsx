"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/posts";

// Velog 스타일 플로팅 TOC. 넓은 화면(xl+)에서 본문 우측에 고정, 스크롤 위치에 따라 활성 항목 하이라이트.
export function TocFloating({ items }: { items: TocItem[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const headings = items
      .map((it) => document.getElementById(it.slug))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveSlug(visible[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((el) => observerRef.current!.observe(el));
    return () => observerRef.current?.disconnect();
  }, [items]);

  function handleClick(e: React.MouseEvent, slug: string) {
    e.preventDefault();
    document.getElementById(slug)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (items.length === 0) return null;

  return (
    <aside
      className="fixed top-28 hidden w-48 xl:block"
      style={{ left: "calc(50% + 25rem)" }}
      aria-label="목차"
    >
      <p className="mb-3 text-xs font-medium text-mut">목차</p>
      <ul className="space-y-2 text-sm">
        {items.map((it) => {
          const active = it.slug === activeSlug;
          return (
            <li key={it.slug} style={{ marginLeft: (it.depth - 2) * 12 }}>
              <a
                href={`#${it.slug}`}
                onClick={(e) => handleClick(e, it.slug)}
                className={
                  "block border-l pl-3 transition-colors " +
                  (active
                    ? "border-acc font-medium text-acc"
                    : "border-line text-mut hover:border-mut hover:text-fg")
                }
              >
                {it.text}
              </a>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
