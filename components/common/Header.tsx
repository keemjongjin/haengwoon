"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";

const NAV = {
  tech: [
    { label: "Posts", href: "/posts" },
    { label: "Projects", href: "/projects" },
    { label: "About", href: "/about" },
    { label: "Guestbook", href: "/guestbook" },
  ],
  music: [
    { label: "Archive", href: "/music/archive" },
    { label: "Charts", href: "/music/charts" },
    { label: "Insights", href: "/music/insights" },
  ],
} as const;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const mode: "tech" | "music" =
    pathname === "/music" ||
    pathname.startsWith("/music/") ||
    pathname.startsWith("/artist/")
      ? "music"
      : "tech";

  // 경로에 따라 data-mode 동기화 (CSS 팔레트 전환)
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  // 로고 클릭 = 반대편 세계로 이동
  function switchWorld() {
    router.push(mode === "tech" ? "/music" : "/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      {/* flex-wrap + 개별 아이템에 ml-auto: 공간이 부족하면 겹치거나 잘리지 않고
          넘치는 아이템만(주로 토글) 자연스럽게 다음 줄로 내려가며, 그 줄에서도 우측 정렬 유지 */}
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-8 sm:py-5">
        <button
          onClick={switchWorld}
          className="shrink-0 whitespace-nowrap text-base font-semibold text-fg sm:text-xl"
          aria-label="Tech와 Music 모드 전환"
        >
          Haengwoon
          {/* _tech/_music 글자수 차이로 버튼 폭이 흔들리지 않도록 고정폭(ch)에 좌측 정렬 */}
          <span className="inline-block w-[6ch] text-left text-xs font-normal text-fg sm:text-sm">
            {mode === "tech" ? "_tech" : "_music"}
          </span>
        </button>

        <nav className="ml-auto flex shrink-0 gap-3 text-xs sm:gap-4 sm:text-sm">
          {NAV[mode].map((item) => (
            <Link key={item.href} href={item.href} className="text-mut hover:text-fg">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href={mode === "tech" ? "/search" : "/music/search"}
          aria-label="검색"
          className="shrink-0 text-mut hover:text-fg"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.2" y2="16.2" />
          </svg>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
