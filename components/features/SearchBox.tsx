"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SearchRecord } from "@/lib/search";

export function SearchBox({ records }: { records: SearchRecord[] }) {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return records.filter((r) => {
      const haystack = (
        r.title +
        " " +
        r.description +
        " " +
        r.tags.join(" ") +
        " " +
        r.text
      ).toLowerCase();
      return haystack.includes(query);
    });
  }, [q, records]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="글 검색 (제목·내용·태그)"
        autoFocus
        className="w-full rounded-xl border border-line bg-card px-4 py-3 text-base outline-none focus:border-acc"
      />

      {q.trim() && (
        <p className="mt-4 text-sm text-mut">{results.length}개 결과</p>
      )}

      <ul className="mt-2">
        {results.map((r) => (
          <li key={r.slug} className="border-b border-line py-4">
            <Link href={`/posts/${r.slug}`} className="block group">
              <h3 className="font-semibold group-hover:text-acc">{r.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-mut">{r.description}</p>
              <span className="mt-1 inline-block text-xs text-acc">{r.category}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
