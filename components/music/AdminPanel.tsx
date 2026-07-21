"use client";

import { useCallback, useEffect, useState } from "react";

type Album = {
  id: number;
  title: string;
  artist: string;
  manualRating: number | null;
  eloRating: number;
  eloScore10: number;
};

export function AdminPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");
  const [pair, setPair] = useState<{ a: Album; b: Album } | null>(null);
  const [standings, setStandings] = useState<Album[]>([]);

  const loadStandings = useCallback(async () => {
    const res = await fetch("/api/albums");
    const data = await res.json();
    setStandings(
      [...data.albums].sort((x: Album, y: Album) => y.eloRating - x.eloRating)
    );
  }, []);

  const loadMatch = useCallback(async () => {
    const res = await fetch("/api/match");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    const data = await res.json();
    if (data.ok) setPair({ a: data.a, b: data.b });
  }, []);

  useEffect(() => {
    loadStandings();
    loadMatch();
  }, [loadStandings, loadMatch]);

  async function login() {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (res.ok) {
      setMsg("");
      setKey("");
      await loadMatch();
    } else {
      setMsg("키가 올바르지 않습니다.");
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthed(false);
    setPair(null);
  }

  async function vote(winnerId: number, loserId: number) {
    const res = await fetch("/api/match/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winnerId, loserId }),
    });
    if (res.ok) {
      await loadStandings();
      await loadMatch();
    }
  }

  if (authed === null) return <p className="text-mut">불러오는 중…</p>;

  if (!authed) {
    return (
      <div className="max-w-sm">
        <p className="mb-3 text-mut">관리자 로그인이 필요합니다.</p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="ADMIN_KEY"
          className="w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-acc"
        />
        {msg && <p className="mt-2 text-sm text-red-500">{msg}</p>}
        <button
          onClick={login}
          className="mt-3 rounded-full bg-acc px-6 py-2.5 font-semibold text-on-acc"
        >
          로그인
        </button>
        <p className="mt-3 text-xs text-mut">개발용 기본값: dev-admin-key</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm text-mut">🔓 관리자 모드</span>
        <div className="flex gap-3 text-sm">
          <a href="/api/backup" className="text-mut hover:text-fg">
            백업 다운로드
          </a>
          <button onClick={logout} className="text-mut hover:text-fg">
            로그아웃
          </button>
        </div>
      </div>

      {pair && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium text-mut">🎧 Album Worldcup</h2>
          <div className="flex items-stretch gap-4">
            {[pair.a, pair.b].map((al, i) => {
              const other = i === 0 ? pair.b : pair.a;
              return (
                <button
                  key={al.id}
                  onClick={() => vote(al.id, other.id)}
                  className="flex-1 rounded-2xl border border-line bg-card p-5 text-left transition-colors hover:border-acc"
                >
                  <div className="font-semibold">{al.title}</div>
                  <div className="text-sm text-mut">{al.artist}</div>
                  <div className="mt-3 rounded-full bg-acc px-4 py-2 text-center text-sm font-semibold text-on-acc">
                    이 앨범 ▶
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-mut">🏆 현재 순위 (Elo)</h2>
        <ul>
          {standings.map((al, i) => (
            <li
              key={al.id}
              className="flex items-center gap-4 border-b border-line py-3"
            >
              <span className="w-6 font-bold text-acc">{i + 1}</span>
              <span className="flex-1">
                {al.title} <span className="text-mut">— {al.artist}</span>
              </span>
              <span className="text-sm text-mut">
                평점 {al.manualRating ?? "–"} · Elo {al.eloRating} ({al.eloScore10})
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
