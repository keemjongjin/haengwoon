import Link from "next/link";

// 소셜 바로가기 + 관리자 로그인(눈에 안 띄게) — DECISIONS.log UX 결정 반영
const LINKS = [
  { label: "github", href: "https://github.com/" },
  { label: "resume", href: "/resume" },
  { label: "instagram", href: "https://instagram.com/" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line px-8 py-8 text-sm text-mut">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="hover:text-fg">
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <span>© {new Date().getFullYear()} Haengwoon</span>
          {/* 관리자 로그인 — 눈에 띄지 않게 */}
          <Link href="/music/admin" className="text-mut/60 hover:text-fg">
            ·
          </Link>
        </div>
      </div>
    </footer>
  );
}
