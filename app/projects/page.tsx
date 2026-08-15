import Image from "next/image";
import Link from "next/link";
import { getAllProjects, type ProjectLinks } from "@/lib/content/projects";

export const metadata = { title: "Projects — Haengwoon" };

/** 외부로 나가는 링크 아이콘 한 종류. URL이 없는 종류는 아예 렌더하지 않는다(죽은 아이콘 방지). */
const LINK_LABELS: Record<keyof ProjectLinks, string> = {
  post: "관련 글",
  github: "GitHub",
  demo: "Demo",
  googlePlay: "Google Play",
  appStore: "App Store",
};

export default function ProjectsPage() {
  const projects = getAllProjects();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {projects.map((p) => (
          <div
            key={p.slug}
            className="flex flex-col overflow-hidden rounded-xl border border-line bg-card transition-colors hover:border-acc"
          >
            <Link href={`/projects/${p.slug}`} className="block">
              {/* 썸네일이 없으면 이니셜 플레이스홀더 — 앨범 커버 없을 때 쓰는 것과 같은 패턴 */}
              <div className="relative aspect-video w-full overflow-hidden bg-bg">
                {p.thumbnailUrl ? (
                  <Image src={p.thumbnailUrl} alt={p.title} fill sizes="400px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-mut">
                    {p.title.slice(0, 1)}
                  </div>
                )}
              </div>
            </Link>

            <div className="flex flex-1 flex-col p-5">
              <Link href={`/projects/${p.slug}`}>
                <h2 className="font-semibold hover:text-acc">{p.title}</h2>
              </Link>
              <p className="mt-2 text-sm text-mut">{p.description}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {p.techStack.map((t) => (
                  <span key={t} className="text-xs text-acc">
                    #{t}
                  </span>
                ))}
              </div>

              {/* 값이 있는 링크만 아이콘 대신 텍스트 배지로 — 새 탭으로 열어 이탈해도 이 목록은 그대로 남는다 */}
              {p.links && Object.values(p.links).some(Boolean) && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3 text-xs">
                  {(Object.keys(LINK_LABELS) as (keyof ProjectLinks)[])
                    .filter((key) => p.links?.[key])
                    .map((key) => (
                      <a
                        key={key}
                        href={p.links![key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-line px-2.5 py-1 text-mut hover:border-acc hover:text-acc"
                      >
                        {LINK_LABELS[key]}
                      </a>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
