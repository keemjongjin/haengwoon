"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/music", label: "Music" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/profile", label: "Profile" },
];

export function AdminNav({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();

  return (
    <div className="mb-8 flex items-center justify-between border-b border-line pb-3">
      <nav className="flex gap-4 text-sm">
        {TABS.map((t) => {
          const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={active ? "font-medium text-fg" : "text-mut hover:text-fg"}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <button onClick={onLogout} className="text-sm text-mut hover:text-fg">
        로그아웃
      </button>
    </div>
  );
}
