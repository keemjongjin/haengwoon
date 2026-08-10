"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 두 세계(Tech/Music) 사이 이동 — 예전엔 헤더 로고가 토글 역할을 했지만, 로고는 "지금 세계의 홈"으로
// 가는 게 자연스러워서 세계 전환을 이쪽으로 옮겼다. 눈에 띄지 않게 두고 싶은 링크들과 같은 자리.
const WORLDS = [
  { label: "tech", href: "/" },
  { label: "music", href: "/music" },
];

// 소셜 바로가기 + 관리자 링크
const LINKS = [
  { label: "github", href: "https://github.com/keemjongjin" },
  { label: "resume", href: "/resume" },
  { label: "instagram", href: "https://instagram.com/haeng_woon" },
  { label: "admin", href: "/admin" },
];

/** app/layout.tsx 최하단 고정 — 세계 전환 + 소셜 링크 + 관리자 진입 링크 + 저작권 표시. */
export function Footer() {
  const pathname = usePathname();
  const mode: "tech" | "music" =
    pathname === "/music" || pathname.startsWith("/music/") || pathname.startsWith("/artist/")
      ? "music"
      : "tech";

  return (
    <footer className="mt-auto border-t border-line text-xs text-mut sm:text-sm">
      {/* 세로 여백(py)은 한 줄이던 시절의 py-6/py-8에서 줄였다. 줄이 하나 늘었는데 여백을
          그대로 두면 푸터만 두꺼워져 눈에 띈다 — 두 줄 + 좁은 줄간격을 합쳐 예전 높이(약 85px)를
          그대로 유지하도록 맞춘 값이다. */}
      {/* items-center: 저작권 문구는 두 줄짜리 왼쪽 블록의 세로 중앙에 맞춘다
          (items-end면 아래 줄에 붙어 푸터가 한쪽으로 쏠려 보인다) */}
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-8 sm:py-5">
        <div className="flex flex-col gap-[3px]">
          {/* 상단 줄: 세계 전환. 지금 있는 쪽을 굵게 강조하진 않는다(아래 소셜 링크들과 같은
              무게로 조용히 둔다). 다만 aria-current는 남겨 스크린리더에는 현재 위치가 전달된다. */}
          <div className="flex gap-3 sm:gap-4">
            {WORLDS.map((w) => (
              <Link
                key={w.label}
                href={w.href}
                aria-current={mode === w.label ? "page" : undefined}
                className="hover:text-fg"
              >
                {w.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-3 sm:gap-4">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="hover:text-fg">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <span>© {new Date().getFullYear()} Haengwoon</span>
      </div>
    </footer>
  );
}
