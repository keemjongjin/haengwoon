"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Cover } from "./Cover";

export type ArchiveAlbum = {
  id: number;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  genre: string | null;
  reviewDate: string | null;
  releaseDate: string | null;
  manualRating: number | null;
};

type Basis = "review" | "release";

function yearOf(d: string | null): string {
  return d ? d.slice(0, 4) : "?";
}

export function ArchiveFilters({ albums }: { albums: ArchiveAlbum[] }) {
  const [basis, setBasis] = useState<Basis>("review");
  const [year, setYear] = useState("전체");
  const [genre, setGenre] = useState("전체");

  // 선택한 기준(리뷰일/발매일)의 날짜를 뽑는다
  const dateOf = (a: ArchiveAlbum) => (basis === "review" ? a.reviewDate : a.releaseDate);

  const years = useMemo(
    () =>
      ["전체", ...Array.from(new Set(albums.map((a) => yearOf(dateOf(a))))).sort().reverse()],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [albums, basis]
  );
  const genres = useMemo(
    () => ["전체", ...Array.from(new Set(albums.map((a) => a.genre).filter(Boolean) as string[]))],
    [albums]
  );

  const shown = albums
    .filter(
      (a) =>
        (year === "전체" || yearOf(dateOf(a)) === year) &&
        (genre === "전체" || a.genre === genre)
    )
    .sort((a, b) => ((dateOf(a) ?? "") < (dateOf(b) ?? "") ? 1 : -1));

  function changeBasis(b: Basis) {
    setBasis(b);
    setYear("전체"); // 기준 바뀌면 연도 초기화
  }

  return (
    <div>
      {/* 기준 토글: 리뷰일 / 발매일 */}
      <div className="mb-4 inline-flex rounded-full border border-line p-1 text-xs">
        {(
          [
            ["review", "내 리뷰일 기준"],
            ["release", "앨범 발매일 기준"],
          ] as [Basis, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => changeBasis(key)}
            className={
              "rounded-full px-3 py-1.5 " +
              (basis === key ? "bg-acc text-on-acc font-medium" : "text-mut hover:text-fg")
            }
          >
            {label}
          </button>
        ))}
      </div>

      <FilterRow label="연도" options={years} value={year} onChange={setYear} />
      <FilterRow label="장르" options={genres} value={genre} onChange={setGenre} />

      <ul className="mt-6">
        {shown.map((a) => (
          <li key={a.id} className="flex items-center gap-4 border-b border-line py-3">
            <Cover id={a.id} title={a.title} url={a.coverImageUrl} size={44} />
            <Link href={`/music/album/${a.id}`} className="flex-1 hover:text-acc">
              <span className="font-medium">{a.title}</span>{" "}
              <span className="text-sm text-mut">— {a.artist}</span>
            </Link>
            <span className="text-xs text-mut">
              {a.genre} · {basis === "review" ? "리뷰" : "발매"} {yearOf(dateOf(a))}
            </span>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-6 text-sm text-mut">해당 조건의 앨범이 없습니다.</p>}
    </div>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="w-8 text-xs text-mut">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={
            "rounded-full px-3 py-1 text-xs " +
            (value === o ? "bg-acc text-on-acc" : "border border-line text-mut hover:text-fg")
          }
        >
          {o}
        </button>
      ))}
    </div>
  );
}
