"use client";

import Link from "next/link";
import { useState } from "react";
import { Cover } from "./Cover";

export type LbAlbum = {
  id: number;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  manualRating: number | null;
  eloRating: number;
  eloScore10: number;
};

type Tab = "rating" | "elo";

export function LeaderboardTabs({ albums }: { albums: LbAlbum[] }) {
  const [tab, setTab] = useState<Tab>("rating");

  const sorted = [...albums].sort((a, b) =>
    tab === "rating"
      ? (b.manualRating ?? 0) - (a.manualRating ?? 0)
      : b.eloRating - a.eloRating
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "rating", label: "평점 랭킹" },
    { key: "elo", label: "취향 대결 (Elo)" },
  ];

  return (
    <div>
      <div className="mb-4 flex gap-5 border-b border-line text-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "pb-2 " +
              (tab === t.key
                ? "text-fg font-medium border-b-2 border-acc"
                : "text-mut hover:text-fg")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul>
        {sorted.map((a, i) => (
          <li key={a.id} className="flex items-center gap-4 border-b border-line py-3">
            <span className="w-6 font-bold text-acc">{i + 1}</span>
            <Cover id={a.id} title={a.title} url={a.coverImageUrl} size={44} />
            <Link href={`/music/album/${a.id}`} className="flex-1 hover:text-acc">
              <span className="font-medium">{a.title}</span>{" "}
              <span className="text-sm text-mut">— {a.artist}</span>
            </Link>
            <span className="text-sm">
              {tab === "rating" ? (
                <span className="font-bold">
                  {a.manualRating ?? "–"}
                  <span className="text-xs font-medium text-mut">/10</span>
                </span>
              ) : (
                <span className="text-mut">
                  Elo <span className="font-bold text-fg">{a.eloRating}</span> ({a.eloScore10})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
