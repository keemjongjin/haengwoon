"use client";

// Music 홈 히어로(월간 LP 진열대) 아래에 깔리는 커버 그리드.
// 여태 월간 추천에 올린 앨범을 아티스트 이름순으로 한 판에 늘어놓아, 진열대를 한 장씩 넘겨보는
// 것과 다른 "한눈에 훑기" 경로를 준다.
//
// 첫 화면에서는 보이지 않아야 한다(히어로가 화면을 꽉 채우고, 아래로 끌어내려야 나온다).
// 화면에 처음 들어올 때 살짝 떠오르게 해서 "스크롤해서 발견한" 느낌을 준다.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** 그리드에 필요한 최소 정보. */
export type GridAlbum = {
  id: number;
  title: string;
  artist: string;
  coverImageUrl: string | null;
};

/** 한 번에 더 보여줄 장수. 데스크톱에서 5열 × 2줄 = 정확히 한 판이 채워진다. */
const PAGE = 10;

export function PickedAlbumGrid({
  albums,
  onOpen,
}: {
  albums: GridAlbum[];
  /** 커버를 누르면 진열대와 똑같이 플레이어 뷰로 들어간다. */
  onOpen: (albumId: number) => void;
}) {
  const [shown, setShown] = useState(PAGE);
  const [revealed, setRevealed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 스크롤 위치 하나로 두 가지를 판단한다 — 그리드가 화면에 들어왔는가(떠오르기),
  // 바닥에 닿았는가(10장 더).
  //
  // IntersectionObserver 대신 스크롤을 직접 듣는 이유: 관찰 콜백은 렌더 파이프라인이 멈춘
  // 환경(백그라운드 탭 등)에서 아예 오지 않는데, 그러면 그리드가 opacity-0으로 영영 남아
  // 콘텐츠가 통째로 사라진다. 화면을 가리는 연출은 "안 오면 안 보인다"가 아니라
  // "최악에도 보인다"로 기울어야 한다. 비용은 스크롤당 rect 두 번이라 무시할 만하다.
  useEffect(() => {
    const check = () => {
      const wrap = wrapRef.current;
      if (wrap && wrap.getBoundingClientRect().top < window.innerHeight * 0.9) setRevealed(true);
      // 바닥 감시자는 더 보여줄 게 남았을 때만 렌더되므로, 없으면 볼 것도 없다는 뜻
      const sentinel = sentinelRef.current;
      if (sentinel && sentinel.getBoundingClientRect().top < window.innerHeight + 200) {
        setShown((n) => Math.min(n + PAGE, albums.length));
      }
    };
    check(); // 새로고침으로 스크롤이 복원된 채 들어온 경우
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [albums.length]);

  if (albums.length === 0) return null;

  return (
    <div
      ref={wrapRef}
      className={
        "mt-24 transition-[opacity,transform] duration-700 ease-out " +
        (revealed ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")
      }
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-mut">Picked</h2>
        <span className="text-[11px] tabular-nums text-mut/60">{albums.length}</span>
      </div>

      {/* 체스판처럼 촘촘한 정사각 격자. 데스크톱 5열이라 한 번에 불러오는 10장이 딱 두 줄이 된다. */}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {albums.slice(0, shown).map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onOpen(a.id)}
              aria-label={`${a.title} — ${a.artist} 재생하기`}
              className="group relative block aspect-square w-full overflow-hidden rounded-[3px] bg-card"
            >
              {a.coverImageUrl ? (
                <Image
                  src={a.coverImageUrl}
                  alt={a.title}
                  fill
                  sizes="(min-width: 768px) 150px, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-bold text-mut">
                  {a.title.slice(0, 1)}
                </span>
              )}
              {/* 호버하면 커버 전체를 반투명 회색으로 덮고 가운데에 제목·아티스트.
                  아래쪽 그라디언트에 작은 글씨를 얹던 방식은 커버 그림이 밝으면 글자가 묻혔다.
                  면 전체를 덮으면 어떤 커버 위에서도 대비가 일정하다. */}
              <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-neutral-900/65 px-2 text-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <span className="line-clamp-3 text-[12px] font-semibold leading-snug text-white">
                  {a.title}
                </span>
                <span className="line-clamp-2 text-[11px] leading-snug text-white/70">{a.artist}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* 더 남았을 때만 감시자를 둔다 — 다 보여준 뒤에도 관찰이 돌면 쓸데없는 콜백이 계속 뜬다 */}
      {shown < albums.length && <div ref={sentinelRef} className="h-10" aria-hidden="true" />}
    </div>
  );
}
