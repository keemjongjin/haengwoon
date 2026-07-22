"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminNav } from "./AdminNav";

// 통합 관리자 인증 게이트. /admin/* 전체가 이 안에서 렌더됨(app/admin/layout.tsx).
export function AdminGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [key, setKey] = useState("");
  const [msg, setMsg] = useState("");
  const [loadError, setLoadError] = useState(false);

  const check = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch("/api/auth");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setAuthed(Boolean(data.authed));
    } catch {
      setLoadError(true);
      setAuthed(false); // 실패해도 로그인 화면으로 빠져나가게 함(무한 로딩 방지)
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  async function login() {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (res.ok) {
      setMsg("");
      setKey("");
      await check();
    } else {
      setMsg("키가 올바르지 않습니다.");
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthed(false);
  }

  if (authed === null) return <p className="text-mut">불러오는 중…</p>;

  if (!authed) {
    return (
      <div className="max-w-sm">
        {loadError && (
          <p className="mb-3 text-sm text-red-500">
            서버 연결에 문제가 있었습니다. 개발 서버를 재시작했다면{" "}
            <button onClick={check} className="underline">
              다시 시도
            </button>
            해보세요.
          </p>
        )}
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
      </div>
    );
  }

  return (
    <div>
      <AdminNav onLogout={logout} />
      {children}
    </div>
  );
}
