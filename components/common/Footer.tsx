import Link from "next/link";

// 소셜 바로가기 + 관리자 링크
const LINKS = [
  { label: "github", href: "https://github.com/keemjongjin" },
  { label: "resume", href: "/resume" },
  { label: "instagram", href: "https://instagram.com/heang_woon" },
  { label: "admin", href: "/admin" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line text-xs text-mut sm:text-sm">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex gap-3 sm:gap-4">
          {LINKS.map((l) => (
            <Link key={l.label} href={l.href} className="hover:text-fg">
              {l.label}
            </Link>
          ))}
        </div>
        <span>© {new Date().getFullYear()} Haengwoon</span>
      </div>
    </footer>
  );
}
