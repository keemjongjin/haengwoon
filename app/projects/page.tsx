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

      {/* 1열 리스트, 각 항목은 이미지 + 텍스트가 가로로 나란히. 2열 그리드는 썸네일이 클수록
          보기 좋은데, 이 사이트는 본문 폭이 max-w-3xl로 좁아서 카드가 둘로 쪼개지면 오히려
          한 장 한 장이 작아진다. 세로로 쌓는 목록이 이 폭에는 더 잘 맞는다. */}
      <div className="flex flex-col gap-4">
        {projects.map((p) => (
          <div
            key={p.slug}
            // ★ 패딩을 카드 전체가 아니라 텍스트 쪽 div에만 준다. 이미지는 카드 바깥 틀
            // (rounded-xl + overflow-hidden)에 바로 맞닿은 채로 두고, 그 틀이 이미지의
            // 좌측 모서리를 그대로 잘라 둥글린다 — 이미지에 따로 rounded-lg를 주고 카드
            // 안에 상자 하나를 더 넣는 대신, 라운드 값의 출처를 카드 하나로 통일한 것.
            // 그래서 카드 반경을 나중에 바꿔도(rounded-xl → rounded-2xl 등) 이미지 쪽을
            // 따로 맞출 필요가 없다.
            className="flex overflow-hidden rounded-xl border border-line bg-card transition-colors hover:border-acc"
          >
            <Link
              href={`/projects/${p.slug}`}
              className="relative aspect-square w-24 shrink-0 overflow-hidden bg-bg sm:w-36"
            >
              {/* 썸네일이 없으면 이니셜 플레이스홀더 — 앨범 커버 없을 때 쓰는 것과 같은 패턴 */}
              {p.thumbnailUrl ? (
                <Image src={p.thumbnailUrl} alt={p.title} fill sizes="144px" className="object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-mut sm:text-3xl">
                  {p.title.slice(0, 1)}
                </div>
              )}
            </Link>

            {/* min-w-0: flex 자식은 기본 min-width:auto라 내용이 길면 부모 폭을 밀어낸다.
                0으로 풀어줘야 태그·배지가 줄바꿈되지 않고 카드 밖으로 삐져나간다. */}
            <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
              <Link href={`/projects/${p.slug}`}>
                <h2 className="font-semibold hover:text-acc">{p.title}</h2>
              </Link>
              <p className="mt-1 line-clamp-2 text-sm text-mut">{p.description}</p>

              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
                {p.techStack.map((t) => (
                  <span key={t} className="text-xs text-acc">
                    #{t}
                  </span>
                ))}
              </div>

              {/* mt-auto: 이미지 높이만큼 남는 여백을 아래로 밀어, 링크 배지가 항상 카드
                  바닥에 붙는다(설명 길이가 카드마다 달라도 배지 줄 위치가 들쭉날쭉하지 않음) */}
              {p.links && Object.values(p.links).some(Boolean) && (
                <div className="mt-auto flex flex-wrap gap-2 pt-2 text-xs">
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
