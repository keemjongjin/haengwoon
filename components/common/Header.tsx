"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = {
  tech: [
    { label: "Posts", href: "/posts" },
    { label: "Projects", href: "/projects" },
    { label: "About", href: "/about" },
  ],
  music: [
    { label: "Archive", href: "/music/archive" },
    { label: "Leaderboard", href: "/music/leaderboard" },
    { label: "Insights", href: "/music/insights" },
  ],
} as const;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const mode: "tech" | "music" =
    pathname === "/music" || pathname.startsWith("/music/") ? "music" : "tech";

  const [theme, setTheme] = useState<"light" | "dark">("light");

  // 경로에 따라 data-mode 동기화 (CSS 팔레트 전환)
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  // 최초 마운트 시 저장된 테마 반영
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.dataset.theme = next;
  }

  // 로고 클릭 = 반대편 세계로 이동
  function switchWorld() {
    router.push(mode === "tech" ? "/music" : "/");
  }

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-line">
      <button
        onClick={switchWorld}
        className="text-xl font-semibold text-fg"
        aria-label="Tech와 Music 모드 전환"
      >
        Haengwoon
        <span className="text-sm font-normal text-fg">
          {mode === "tech" ? "_tech" : "_music"}
        </span>
      </button>

      <div className="flex items-center gap-5">
        <nav className="flex gap-4 text-sm">
          {NAV[mode].map((item) => (
            <Link key={item.href} href={item.href} className="text-mut hover:text-fg">
              {item.label}
            </Link>
          ))}
        </nav>
        {mode === "tech" && (
          <Link href="/search" aria-label="검색" className="text-mut hover:text-fg">
            🔍
          </Link>
        )}
        <button onClick={toggleTheme} aria-label="라이트/다크 전환" className="text-base">
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </div>
    </header>
  );
}
