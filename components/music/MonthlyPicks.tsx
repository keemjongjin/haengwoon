"use client";

// /music 홈 최상단의 월간 추천 LP 캐러셀. 관리자가 매달 직접 고른 앨범(최대 10장)을
// 레코드 진열대를 넘겨보듯 좌우로 훑어보는 화면.
//
// 캐러셀은 라이브러리 없이 CSS scroll-snap으로 만든다 — 모바일 스와이프/트랙패드/휠이 전부 브라우저
// 기본 동작으로 해결되고, 이 사이트가 차트도 CSS 막대로, 사운드웨이브도 CSS 애니메이션으로 만든
// "의존성 최소화" 방침과도 맞다. 가운데 어느 앨범이 왔는지는 스크롤 위치를 직접 계산해서 판단하고
// (IntersectionObserver보다 snap 캐러셀에선 이 편이 단순·정확), 그 인덱스로부터의 거리에 따라
// 좌우 앨범을 기울인다.
//
// ★ 3D가 진짜로 서려면 아래 세 가지를 전부 지켜야 한다. 하나라도 어기면 두께가 사라지고
//   "가로로 눌린 2차원 그림"이 된다(실제로 그렇게 보이던 걸 고친 이력이 있으니 건드릴 때 주의).
//   1. perspective는 transform 안의 perspective()가 아니라 **CSS 속성**으로 줘야 한다.
//      transform: perspective(...)는 그 요소 자신의 변형에만 적용되고, 자식의 3D는 원근 없이
//      정사영(orthographic)으로 눌린다 — 90°로 세운 옆면은 폭이 정확히 0이 되어 안 보인다.
//   2. 회전하는 요소에 transform-style: preserve-3d를 주고, 앞면·옆면을 그 자식으로 둔다.
//   3. **회전하는 그 요소에는 opacity나 filter를 걸면 안 된다.** 이 둘은 그룹핑 속성이라
//      preserve-3d를 flat으로 되돌려버린다. 흐리게/어둡게는 바깥 래퍼에서 처리한다.

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlbumPlayerView } from "./AlbumPlayerView";
import { PickedAlbumGrid, type GridAlbum } from "./PickedAlbumGrid";
import { useCoverColor } from "./useCoverColor";

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** 케이스 크기(px). 3D 면 배치 계산에 쓰이므로 CSS 클래스가 아니라 상수로 고정한다. */
const BOX = 299;
/** 케이스 두께(px). 스파인 글자가 들어갈 최소치는 유지 — 더 줄이면 세로 제목이 잘린다. */
const DEPTH = 15;
/**
 * 가운데에서 3장 이상 떨어진 카드를 한 단계마다 추가로 끌어당기는 양(px).
 * 이 값이 0이면 그 구간은 자연 피치(BOX+gap)로 벌어진다. 실측한 그 구간의 틈을
 * 절반으로 줄이는 값이라 = 기존 틈 / 2 (아래 shiftX 계산부 주석 참고).
 */
const OUTER_STEP = 108;

/**
 * 본문 폭(max-w-3xl)을 뚫고 화면 전체로 펼치는 클래스.
 * 진열대와 플레이어 둘 다 화면을 꽉 써야 해서 한 곳에 묶어둔다 — 한쪽만 고치다
 * 다른 쪽이 본문 폭에 갇히는 일이 실제로 있었다. 폭 제한은 아래 커버 그리드에만 둔다.
 * overflow-hidden: w-screen(=100vw)이 스크롤바 폭까지 잡아 가로 스크롤이 생기는 걸 막는다.
 */
const FULL_BLEED = "relative left-1/2 w-screen -translate-x-1/2 overflow-hidden";

/** "2026-08" → { year: "2026", month: "AUG" } */
function splitMonthLabel(yearMonth: string): { year: string; month: string } {
  const [y, m] = yearMonth.split("-");
  return { year: y, month: MONTH_ABBR[Number(m) - 1] ?? m };
}

/** 캐러셀에 필요한 앨범 정보만 추린 형태 (서버에서 내려주는 AlbumRow의 부분집합). */
export type PickAlbum = {
  id: number;
  spotifyAlbumId: string | null;
  title: string;
  artist: string;
  coverImageUrl: string | null;
};

function ArrowIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}

/**
 * 앨범 케이스 한 장. 앞면(커버) + 좌우 옆면(두께)을 preserve-3d로 세운 실제 3D 박스.
 * 옆면 두 장을 모두 그려두고 backface-visibility로 뒤를 향한 쪽이 자동으로 숨겨지게 한다
 * (회전 방향에 따라 어느 쪽 옆면이 보일지 직접 분기할 필요가 없어짐).
 */
function AlbumCase({
  album,
  priority,
  transform,
}: {
  album: PickAlbum;
  priority: boolean;
  /** 케이스를 돌리고 옮기는 변형. preserve-3d를 가진 이 루트에 직접 걸어야 앞면·옆면이 함께 돈다. */
  transform: string;
}) {
  // 옆면 색은 커버에서 뽑아 쓴다 — 실제 LP도 스파인이 자켓 인쇄와 같은 판에서 나오므로
  // 고정색을 쓰면 앞뒤가 따로 노는 물건처럼 보인다. 아직 못 뽑았으면(null) 기존 종이색 유지.
  const cover = useCoverColor(album.coverImageUrl);

  // 스파인(옆면)에는 실제 LP 슬리브처럼 제목·아티스트를 세로로 새긴다. 두께만 있는 무지 면보다
  // 훨씬 "물건"처럼 읽히고, 옆으로 누운 카드도 무슨 앨범인지 알아볼 수 있다.
  const spine = (side: "left" | "right") => (
    <div
      className={
        "absolute top-0 flex items-center justify-center overflow-hidden transition-colors duration-500 " +
        (cover ? "" : "bg-[#e8e6e1] dark:bg-[#2a2a28]")
      }
      style={{
        width: DEPTH,
        height: BOX,
        left: (BOX - DEPTH) / 2,
        backfaceVisibility: "hidden",
        transform: `rotateY(${side === "right" ? 90 : -90}deg) translateZ(${BOX / 2}px)`,
        backgroundColor: cover?.spine,
        // 접힌 양 끝은 어둡게, 가운데는 살짝 빛을 받는 종이 두께의 결.
        // 예전엔 전체적으로 더 어둡게 깔았는데, 커버에서 뽑은 색을 쓰기 시작하니 그 색이
        // 죄다 검게 묻혀버렸다. 음영은 형태를 읽히게 하는 정도만 남기고 색을 살린다.
        backgroundImage:
          "linear-gradient(to right, rgba(0,0,0,0.22), rgba(255,255,255,0.10) 38%, rgba(0,0,0,0.06) 68%, rgba(0,0,0,0.24))",
      }}
    >
      <span
        className={
          "whitespace-nowrap text-[9px] font-semibold tracking-tight " +
          (cover ? "" : "text-black/65 dark:text-white/70")
        }
        style={{ writingMode: "vertical-rl", textOrientation: "mixed", color: cover?.ink }}
      >
        {album.title}
        <span className="mx-2 opacity-40">·</span>
        <span className="font-normal opacity-70">{album.artist}</span>
      </span>
    </div>
  );

  return (
    <div
      className="relative transition-transform duration-500 ease-out"
      style={{
        width: BOX,
        height: BOX,
        transformStyle: "preserve-3d",
        transform,
        transformOrigin: "center",
      }}
    >
      {/* 앞면 = 커버 */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[2px] bg-card"
        style={{ transform: `translateZ(${DEPTH / 2}px)` }}
      >
        {album.coverImageUrl ? (
          <Image
            src={album.coverImageUrl}
            alt={album.title}
            fill
            sizes="300px"
            className="object-cover"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-mut">
            {album.title.slice(0, 1)}
          </div>
        )}
        {/* 표면에 비스듬히 떨어지는 빛 — 평면 그림이 아니라 물체로 보이게 하는 마감.
            어둡게 까는 층은 전부 뺐다(왼쪽 접힘 그림자, 우하단 그늘). 케이스가 이미 진짜 3D
            박스라 두께는 옆면으로 드러나는데, 커버 위에 검은 기울기까지 겹치니 커버 그림만
            가려져 지저분했다. 남긴 건 좌상단 하이라이트뿐. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
      </div>

      {/* 뒷면은 두지 않는다 — 최대 64°까지만 눕히므로 뒤가 보일 일이 없고, 뒷면을 넣으면
          일부 브라우저에서 backface-visibility가 무시돼 커버 위에 덮여버린다(실제로 겪음). */}
      {spine("right")}
      {spine("left")}
    </div>
  );
}

export function MonthlyPicks({
  initialYearMonth,
  initialAlbums,
  initialMonths,
  allPicked,
}: {
  initialYearMonth: string;
  initialAlbums: PickAlbum[];
  initialMonths: string[];
  /** 여태 월간 추천에 올린 앨범 전체 — 히어로 아래 커버 그리드용(아티스트 이름순). */
  allPicked: GridAlbum[];
}) {
  const [yearMonth, setYearMonth] = useState(initialYearMonth);
  const [albums, setAlbums] = useState(initialAlbums);
  const [months] = useState(initialMonths);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  // 앨범을 누르면 진열대 대신 플레이어 뷰로 전환 — 닫으면 다시 진열대로 돌아온다.
  const [openAlbumId, setOpenAlbumId] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // 플레이어를 여닫는 사이 진열대 DOM이 새로 만들어지므로, 마지막 스크롤 위치를 따로 기억해둔다.
  const savedScrollLeft = useRef(0);
  const onOpen = useCallback((id: number) => setOpenAlbumId(id), []);

  // months는 최신순(desc) — 인덱스가 클수록 과거 달이다.
  const monthIdx = months.indexOf(yearMonth);
  const prevMonth = monthIdx >= 0 && monthIdx < months.length - 1 ? months[monthIdx + 1] : null;
  const nextMonth = monthIdx > 0 ? months[monthIdx - 1] : null;
  const { year, month } = splitMonthLabel(yearMonth);

  // 스크롤 중앙에 가장 가까운 카드를 활성 인덱스로. rAF로 묶어 스크롤 이벤트 폭주를 방지.
  const syncActive = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const childCenter = c.offsetLeft + c.offsetWidth / 2;
      const dist = Math.abs(childCenter - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActiveIndex(best);
  }, []);

  // ★ openAlbumId가 의존성에 반드시 들어가야 한다.
  // 플레이어를 열면 진열대 DOM은 통째로 사라졌다가 닫으면 새 노드로 다시 붙는데, 이 컴포넌트
  // 자체는 계속 살아 있다. 의존성이 그대로면 이펙트가 다시 돌지 않아 스크롤 리스너가 이미
  // 사라진 옛 노드에 붙은 채 남고, 새 진열대는 스크롤해도 activeIndex가 갱신되지 않는다.
  // 그러면 가운데로 온 앨범이 옆 카드처럼 비스듬히 누운 채 굳어버린다(실제로 그랬다).
  // 겸사겸사 열기 직전 위치도 되돌려, 닫으면 보던 앨범 자리로 돌아오게 한다.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // scroll-smooth가 걸려 있어 그냥 대입하면 복귀가 스르륵 애니메이션된다 — 즉시 이동시킨다
    el.scrollTo({ left: savedScrollLeft.current, behavior: "instant" });
    let raf = 0;
    const onScroll = () => {
      savedScrollLeft.current = el.scrollLeft;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncActive);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    syncActive();
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [syncActive, albums, openAlbumId]);

  async function goToMonth(ym: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/monthly-picks?ym=${ym}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setAlbums(data.albums);
        setYearMonth(ym);
        setActiveIndex(0);
        savedScrollLeft.current = 0;
        scrollerRef.current?.scrollTo({ left: 0, behavior: "auto" });
      }
    } finally {
      setLoading(false);
    }
  }

  // 플레이어가 열려 있으면 진열대 대신 플레이어만 보여준다(앱처럼 화면이 전환되는 흐름).
  if (openAlbumId != null) {
    // 플레이어도 진열대와 같이 화면 전체 폭을 쓴다 — 본문(max-w-3xl) 안에 그대로 두면
    // 704px에 갇혀 판이 355px로 쪼그라든다(그리드를 넣으며 래퍼를 옮기다 실제로 그랬다).
    // 폭 제한은 아래 커버 그리드에만 남긴다.
    // key: 다른 앨범을 열면 새로 마운트돼 로딩 상태가 깨끗하게 초기화된다
    return (
      <div className={FULL_BLEED}>
        <AlbumPlayerView key={openAlbumId} albumId={openAlbumId} onClose={() => setOpenAlbumId(null)} />
      </div>
    );
  }

  return (
    <>
      {/* 히어로. 화살표를 화면 양 끝에 두려고 본문(max-w-3xl)을 뚫고 전체 폭으로 확장한다.
          높이를 "화면에서 헤더·여백을 뺀 만큼"으로 잡는 건, 접속 직후에는 아래 그리드가
          한 조각도 보이지 않아야 하기 때문 — 아래로 끌어내려야 나타나는 게 이 화면의 의도다. */}
      <section className={`${FULL_BLEED} flex min-h-[calc(100vh-7rem)] items-center`}>
        <div className="w-full">
    <section className="relative">
      {/* 월 라벨: 2026(작게) 위 / AUG(아래). 평소 반투명, 호버 시 두 줄 함께 진해짐 */}
      <div className="group mb-8 flex cursor-default flex-col items-center leading-none">
        <span className="text-[10px] font-semibold tracking-[0.35em] text-fg/20 transition-colors duration-300 group-hover:text-fg/70">
          {year}
        </span>
        <span className="mt-1.5 text-xl font-bold tracking-[0.18em] text-fg/25 transition-colors duration-300 group-hover:text-fg">
          {month}
        </span>
      </div>

      {albums.length === 0 ? (
        <p className="py-20 text-center text-sm text-mut">이 달의 추천 앨범이 아직 없습니다.</p>
      ) : (
        <div
          ref={scrollerRef}
          className={
            "flex snap-x snap-mandatory items-start gap-1 overflow-x-auto scroll-smooth pb-8 pt-6 " +
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
            (loading ? "opacity-50 transition-opacity" : "transition-opacity")
          }
          // 첫/마지막 앨범도 화면 중앙까지 올 수 있도록 좌우에 (뷰포트 절반 - 케이스 절반)만큼 여백
          style={{ paddingLeft: `calc(50% - ${BOX / 2}px)`, paddingRight: `calc(50% - ${BOX / 2}px)` }}
        >
          {albums.map((a, i) => {
            const offset = i - activeIndex;
            const isActive = offset === 0;
            // 좌우 카드는 안쪽을 향해 기울이고, 멀수록 더 작고 흐리게(최대 2단계까지만 차등).
            const clamped = Math.max(-2, Math.min(2, offset));
            // 옆 카드는 스파인(두께)이 확실히 보이도록 깊게 눕힌다 — 각도가 얕으면 그냥
            // 폭이 줄어든 그림처럼 보이고, 깊게 눕혀야 진열대에 꽂힌 물건으로 읽힌다.
            const rotate = isActive ? 0 : clamped > 0 ? -64 : 64;
            const scale = isActive ? 1 : Math.abs(clamped) === 1 ? 0.88 : 0.8;
            const opacity = isActive ? 1 : Math.abs(clamped) === 1 ? 0.7 : 0.45;
            // 옆 카드를 가운데 쪽으로 당겨 진열대처럼 겹치게 한다. 거리에 비례한 고정 배수
            // (-clamped * 68)를 쓰면 카드 중심 간격은 균일해지지만 **눈에 보이는 틈**은 그렇지 않다.
            // 옆 카드는 눕고(64°) 작아져서(0.88 / 0.8) 실제 폭이 제각각이기 때문이다.
            //
            // 그래서 중심 간격이 아니라 "가장자리 사이 틈"을 기준으로 잡았고, 눕힌 카드의 폭은
            // 계산이 아니라 브라우저에서 실측했다 — 원근(perspective)이 들어가면 삼각함수로
            // 구한 값보다 더 작게 투영돼서(1번째 이웃 실측 77px, 계산 98px) 계산만 믿으면 어긋난다.
            //   실측 폭 → 가운데 224px / 1번째 이웃 77px / 2번째 53px
            //   기존 배수(68·136)일 때 틈 → 가운데↔1번째 13px, 1번째↔2번째 94px
            //   목표 → 가운데↔1번째 20px(조금 더 넓게), 1번째↔2번째 62px(기존의 2/3)
            // 당길 양을 1px 늘리면 그 카드가 1px 안쪽으로 붙는다는 관계로 역산 → 61 / 162.
            //
            // 3단계 밖(가운데에서 3장 이상 떨어진 카드)은 회전·크기가 2단계와 같아서 예전엔
            // 당김도 162로 고정했는데, 그러면 그 구간만 카드 간격이 자연 피치(BOX+gap)로 벌어져
            // "가운데 근처만 촘촘하고 양 끝은 헐렁한" 진열대가 된다. 단계마다 OUTER_STEP만큼
            // 더 당겨 끝까지 같은 밀도로 이어지게 한다.
            // BOX를 1/3 키우면 자연 피치도 228→303으로 늘어나므로, 앞서 맞춰둔 근접 간격
            // (가운데↔1번째 21px, 1번째↔2번째 63px)을 지키려면 당김 값도 함께 키워야 한다.
            const PULL = [0, 82, 209];
            const dist = Math.abs(offset);
            const pull = dist <= 2 ? PULL[dist] : PULL[2] + (dist - 2) * OUTER_STEP;
            const shiftX = -Math.sign(offset) * pull;
            return (
              <div key={a.id} className="relative shrink-0 snap-center" style={{ width: BOX, zIndex: 10 - Math.abs(clamped) }}>
                <button
                  type="button"
                  // 가운데 카드를 누르면 플레이어를 열고, 옆 카드를 누르면 먼저 가운데로 가져온다
                  // (진열대에서 판을 뽑아 보는 흐름 — 눌렀는데 엉뚱한 앨범이 열리는 걸 막는다)
                  onClick={() => {
                    if (isActive) onOpen(a.id);
                    else
                      scrollerRef.current?.children[i]?.scrollIntoView({
                        behavior: "smooth",
                        inline: "center",
                        block: "nearest",
                      });
                  }}
                  aria-label={isActive ? `${a.title} 재생하기` : `${a.title} — ${a.artist} 가운데로`}
                  className="block cursor-pointer transition-[opacity,filter,transform] duration-500 ease-out"
                  style={{
                    // 흐리게/어둡게는 반드시 여기(회전하지 않는 바깥층)에서 — 회전하는 요소에 걸면
                    // preserve-3d가 무효화돼 케이스가 도로 납작해진다.
                    opacity,
                    filter: isActive ? "none" : "brightness(0.82)",
                    // ★ 가로 이동도 여기(원근 바깥)에서 한다. 원근 안에서 translateX를 걸면
                    //   카드가 자기 소실점에서 멀어질수록 투영이 찌그러진다 — 실제로 바깥 카드
                    //   폭이 67px에서 13px까지 뭉개졌다. 밖에서 옮기면 각 카드는 정면에서 본
                    //   모습 그대로 유지된 채 위치만 이동한다.
                    transform: `translateX(${shiftX}px)`,
                    // 기울어 뒤로 물러난 카드가 가운데 카드 뒤로 깔리도록 쌓임 순서 지정
                    zIndex: 10 - Math.abs(clamped),
                  }}
                >
                  {/* 원근을 만드는 층. 카드마다 따로 둬서 각자 정면에서 보는 것처럼 투영된다. */}
                  <div style={{ perspective: 900, width: BOX, height: BOX }}>
                    <AlbumCase
                      album={a}
                      priority={i < 3}
                      // 축소는 항상 중심 기준 — 모서리 기준이면 좌우 축소가 비대칭이라
                      // 카드 사이 간격이 들쭉날쭉해진다(가운데는 붙고 바깥은 벌어짐).
                      transform={`rotateY(${rotate}deg) scale(${scale})`}
                    />
                  </div>
                </button>
                {/* 제목·아티스트는 가운데 카드에만 — 옆 카드까지 텍스트가 깔리면 지저분해짐 */}
                <div
                  className={
                    "mt-6 text-center transition-opacity duration-300 " +
                    (isActive ? "opacity-100" : "pointer-events-none opacity-0")
                  }
                  style={{ width: BOX }}
                >
                  <button
                    type="button"
                    onClick={() => onOpen(a.id)}
                    className="block w-full truncate font-semibold hover:text-acc"
                  >
                    {a.title}
                  </button>
                  <Link
                    href={`/artist/${encodeURIComponent(a.artist)}`}
                    className="block truncate text-sm text-mut hover:text-fg hover:underline"
                  >
                    {a.artist}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 이전/다음 달 — 화면 양 끝. 이동할 달이 없으면 렌더하지 않는다. */}
      {prevMonth && (
        <button
          onClick={() => goToMonth(prevMonth)}
          disabled={loading}
          aria-label={`${splitMonthLabel(prevMonth).year} ${splitMonthLabel(prevMonth).month} 보기`}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-mut/50 transition-colors hover:bg-card hover:text-fg disabled:opacity-30 sm:left-6"
        >
          <ArrowIcon dir="left" />
        </button>
      )}
      {nextMonth && (
        <button
          onClick={() => goToMonth(nextMonth)}
          disabled={loading}
          aria-label={`${splitMonthLabel(nextMonth).year} ${splitMonthLabel(nextMonth).month} 보기`}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-mut/50 transition-colors hover:bg-card hover:text-fg disabled:opacity-30 sm:right-6"
        >
          <ArrowIcon dir="right" />
        </button>
      )}
    </section>
        </div>
      </section>

      <PickedAlbumGrid albums={allPicked} onOpen={onOpen} />
    </>
  );
}
