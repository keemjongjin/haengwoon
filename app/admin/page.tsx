"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  counts: { albums: number; tracks: number; comments: number; matches: number; posts: number };
  visits: { today: number; week: number; total: number; topPaths: { path: string; count: number }[] };
  activity: {
    comments: { id: number; authorName: string; content: string; targetType: string; targetId: number; createdAt: string }[];
    matches: { id: number; albumAId: number; albumBId: number; winnerId: number; createdAt: string }[];
  };
};

type SpotifyStatus = {
  clientConfigured: boolean;
  playbackConfigured: boolean;
  valid: boolean;
  expiresAt?: number;
  error?: string;
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [spotify, setSpotify] = useState<SpotifyStatus | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => setStats(d));
  }, []);

  async function checkSpotify() {
    setChecking(true);
    const res = await fetch("/api/admin/spotify-status");
    const data = await res.json();
    setSpotify(data);
    setChecking(false);
  }

  if (!stats) return <p className="text-mut">불러오는 중…</p>;

  const cards = [
    ["글", stats.counts.posts],
    ["앨범", stats.counts.albums],
    ["댓글", stats.counts.comments],
    ["오늘 방문", stats.visits.today],
  ] as const;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(([label, val]) => (
          <div key={label} className="rounded-xl bg-card p-4">
            <p className="text-xs text-mut">{label}</p>
            <p className="mt-1 text-2xl font-bold">{val}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-4 text-sm text-mut">
        <span>이번 주 방문 {stats.visits.week}</span>
        <span>누적 방문 {stats.visits.total}</span>
        <span>월드컵 {stats.counts.matches}판</span>
      </div>

      {/* Spotify 연결 상태 */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-mut">🎵 Spotify 연결 상태</h2>
        <div className="rounded-xl border border-line bg-card p-4">
          {spotify ? (
            <div className="text-sm">
              <p>
                메타데이터(검색): {spotify.clientConfigured ? "✅ 연결됨" : "❌ 미설정"}
              </p>
              <p className="mt-1">
                재생(SDK): {spotify.playbackConfigured ? (spotify.valid ? "✅ 정상 작동" : "⚠️ 토큰 만료/무효") : "❌ 미연결"}
              </p>
              {spotify.error && <p className="mt-1 text-xs text-red-500">{spotify.error}</p>}
            </div>
          ) : (
            <p className="text-sm text-mut">아직 확인하지 않았습니다.</p>
          )}
          <div className="mt-3 flex gap-3">
            <button
              onClick={checkSpotify}
              disabled={checking}
              className="rounded-full border border-line px-4 py-1.5 text-xs hover:border-acc disabled:opacity-50"
            >
              {checking ? "확인 중…" : "상태 확인"}
            </button>
            <a href="/api/spotify/authorize" className="text-xs text-mut hover:text-fg self-center">
              Spotify 재연결
            </a>
          </div>
        </div>
      </section>

      {/* 인기 페이지 */}
      {stats.visits.topPaths.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-mut">📈 인기 페이지 (누적)</h2>
          <ul className="text-sm">
            {stats.visits.topPaths.map((p) => (
              <li key={p.path} className="flex justify-between border-b border-line py-2">
                <span className="text-mut">{p.path}</span>
                <span className="font-medium">{p.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 최근 활동 */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-mut">🕓 최근 활동</h2>
        <ul className="text-sm space-y-2">
          {stats.activity.comments.map((c) => (
            <li key={`c${c.id}`} className="text-mut">
              💬 <span className="text-fg">{c.authorName}</span>: {c.content.slice(0, 40)}
            </li>
          ))}
          {stats.activity.matches.map((m) => (
            <li key={`m${m.id}`} className="text-mut">
              🎧 월드컵 투표 (앨범 #{m.winnerId} 승)
            </li>
          ))}
          {stats.activity.comments.length === 0 && stats.activity.matches.length === 0 && (
            <li className="text-mut">아직 활동이 없습니다.</li>
          )}
        </ul>
      </section>

      {/* 빠른 링크 */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-mut">🔗 빠른 링크</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <a href="https://console.neon.tech" target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-4 py-1.5 hover:border-acc">
            Neon 콘솔 열기
          </a>
          <a href="/api/backup" className="rounded-full border border-line px-4 py-1.5 hover:border-acc">
            백업 다운로드
          </a>
          <Link href="/admin/posts" className="rounded-full border border-line px-4 py-1.5 hover:border-acc">
            글 목록·작성 가이드
          </Link>
          <Link href="/admin/music" className="rounded-full border border-line px-4 py-1.5 hover:border-acc">
            음악 관리
          </Link>
        </div>
        <p className="mt-3 text-xs text-mut">
          DB를 표 형태로 보려면 터미널에서 <code className="rounded bg-card px-1.5 py-0.5">npm run db:studio</code> 실행
        </p>
      </section>
    </div>
  );
}
