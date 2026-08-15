"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 두 세계(Tech/Music) 사이 이동 — 예전엔 헤더 로고가 토글 역할을 했지만, 로고는 "지금 세계의 홈"으로
// 가는 게 자연스러워서 세계 전환을 이쪽으로 옮겼다. 이력서 링크도 같은 줄에 조용히 얹는다.
const WORLDS = [
  { label: "tech", href: "/" },
  { label: "music", href: "/music" },
];

/** 아이콘 하나 + 나가는 링크. mailto:는 새 탭이 아니라 OS 메일 앱을 열어야 하므로 external=false. */
const SOCIAL: { label: string; href: string; external: boolean; Icon: ComponentType<{ className?: string }> }[] = [
  { label: "이메일", href: "mailto:keemj200@gmail.com", external: false, Icon: MailIcon },
  { label: "Instagram", href: "https://instagram.com/haeng_woon", external: true, Icon: InstagramIcon },
  { label: "LinkedIn", href: "https://www.linkedin.com/", external: true, Icon: LinkedInIcon },
  { label: "GitHub", href: "https://github.com/keemjongjin", external: true, Icon: GithubIcon },
];

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

/** app/layout.tsx 최하단 고정 — 세계 전환·이력서 + 소셜 아이콘 + 저작권(=숨은 관리자 진입). */
export function Footer() {
  const pathname = usePathname();
  const mode: "tech" | "music" =
    pathname === "/music" || pathname.startsWith("/music/") || pathname.startsWith("/artist/")
      ? "music"
      : "tech";

  return (
    <footer className="mt-auto border-t border-line text-xs text-mut sm:text-sm">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5 sm:px-8">
        {/* 왼쪽: 세계 전환 + 이력서, 전부 같은 무게로 조용히 나열 */}
        <div className="flex items-center gap-3 sm:gap-4">
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
          {/* 라벨만 portfolio — 경로는 그대로 /resume. About과 내용이 겹칠 것 같다며
              이 페이지를 포트폴리오 성격으로 다시 꾸밀 계획이라, 우선 라벨만 맞춰둔다. */}
          <Link href="/resume" className="hover:text-fg">
            portfolio
          </Link>
        </div>

        {/* 오른쪽: 아이콘 줄이 위, 저작권 줄이 아래 — 두 줄 다 오른쪽 끝을 맞춘다(items-end),
            이 블록 자체가 이미 footer 오른쪽 끝에 붙어 있으니 그 결과 오른쪽 정렬이 된다.
            저작권 문구는 평범해 보이지만 실은 /admin으로 가는 링크다 — 일부러 아무 표시
            (밑줄·색 변화)도 주지 않는다. 눈에 띄면 "숨긴" 의미가 없어진다. */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3.5">
            {SOCIAL.map(({ label, href, external, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="text-mut transition-colors hover:text-fg"
              >
                <Icon className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
          <Link href="/admin">© {new Date().getFullYear()} Haengwoon. All rights reserved.</Link>
        </div>
      </div>
    </footer>
  );
}
