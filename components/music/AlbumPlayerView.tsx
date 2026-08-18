"use client";

// /music 홈 진열대에서 앨범을 눌렀을 때 그 자리에서 펼쳐지는 플레이어 뷰(MD Vinyl 풍).
// 앨범 상세 페이지(/music/album/[spotifyId])는 그대로 두고(아카이브 등에서 계속 씀), 여기서는
// "듣는 경험"에만 집중한다 — 커버 + 빠져나오는 LP + 톤암 + 수록곡 리스트.
//
// 음원은 두 계층이다:
//  1) 기본: 전역 재생바(AudioPlayerContext)의 Deezer 30초 미리듣기 — Spotify에 의존하지 않아
//     UI 자유도가 100%이고 모든 방문자에게 동일하게 동작한다.
//  2) 전곡: SpotifyFullPlayer(iFrame API) — 브라우저에 Spotify 로그인이 된 방문자만 전곡.

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer, type NowPlayingTrack } from "./player/AudioPlayerContext";
import { SpotifyFullPlayer, PREVIEW_MAX_SEC } from "./player/SpotifyFullPlayer";
import { TrackTierStars } from "./track/TrackTierStars";
import { useCoverColor } from "./useCoverColor";
import { lpSurface } from "@/lib/media/lpDesign";

type PlayerTrack = {
  id: number;
  spotifyTrackId: string | null;
  title: string;
  trackNumber: number;
  durationMs: number | null;
  previewUrl: string | null;
  isFavorite: boolean;
  manualRating: number | null;
};

type PlayerAlbum = {
  id: number;
  spotifyAlbumId: string | null;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  review: string | null;
  /** 관리자가 지정한 판 색·무늬. 없으면 기본 검정판(lib/media/lpDesign.ts). */
  lpColor: string | null;
  lpPattern: string | null;
};

// ── 톤암 기하 ──────────────────────────────────────────────────────────────────
// 컨테이너 폭을 W라 하면 (aspect 1.45 → 높이 H = 0.690W), 판은 지름 0.62W이고
// 중심은 재생 시 (0.69W, 0.345W) / 정지 시 (0.57W, 0.345W)에 온다.
//
// ★ 피벗은 반드시 판 **바깥**이어야 한다. 실제 턴테이블도 회전축은 플래터 옆에 있고
//   팔만 판 위로 뻗는다. 예전에는 피벗이 판 영역 위에 얹혀 관절이 판을 밟고 있었다.
//   여기서 피벗(0.95W, 0.069W)은 재생 시 판 중심에서 0.357W 떨어져 있어 반지름 0.31W보다
//   확실히 바깥이다(여유 ≈ 0.047W).
const ARM_RIGHT_PCT = 0.05; // 컨테이너 오른쪽에서 피벗까지
const ARM_TOP_PCT = 0.1; // 컨테이너 위에서 피벗까지
const ARM_WIDTH = 10; // 톤암 래퍼 폭(px) — 피벗 x를 중심으로 잡을 때 절반을 뺀다
// 래퍼 아래로 더 나온 바늘 끝 — 암 높이에 대한 비율. 고정 px였을 땐 xl에서 13/264=4.9%,
// 모바일에서 13/120=10.8%로 화면마다 실효 암 길이가 달라져 "바늘이 판 위인가" 판정이 어긋났다.
const STYLUS_OVERHANG_RATIO = 0.048;

// ── 톤암 끝단(J자 꺾임) ──────────────────────────────────────────────────────
// 레퍼런스 사진 실측 → ×0.495 환산. 부품은 전부 em이고 래퍼 font-size ≈ 암 높이/9.6이라
// 화면 크기가 바뀌어도 비율이 유지된다.
const TUBE_DX = 1.26; // 파이프가 피벗 축에서 오른쪽으로 벗어난 거리(ref 70px)
const TUBE_REAR = 1.5; // 피벗보다 위로 올라간 뒤쪽 파이프(ref 115px, 컨테이너 밖으로 안 나가게 줄임)
const TUBE_W = 0.32; // 파이프 굵기(ref 18px)
const BEND_DEG = 24; // ★ 끝에서 꺾이는 각도 — 이게 없으면 그냥 막대기다
const BEND_TOP = 75.3; // 꺾임 시작 지점(암 높이의 %)
// 꺾인 축 위에서의 배분: 파이프 → 헤드셸 → 노란 가드. 합이 피벗~바늘 거리와 맞아떨어져야
// 바늘 끝이 래퍼 바닥 중앙(=armGeometry의 팁 계산 전제)에 정확히 떨어진다.
// 헤드셸 실측: 사진 속 바운딩박스 75×95px는 블록이 25° 기울어진 결과다. w×2w 직사각형을
// 25° 돌리면 bbox = (w·cos+2w·sin) × (w·sin+2w·cos) = 1.75w × 2.24w → w≈42.8, h≈85.6px.
// 환산하면 0.77em × 1.54em. (예전엔 1:1 정사각형이라 실기와 전혀 달랐다.)
const BENT_LEN = 1.26;
const HS_LEN = 1.54; // 헤드셸 길이
const HS_W = 0.77; // 헤드셸 폭 — 길이의 정확히 절반(1:2)
const GUARD_LEN = 0.3; // 노란 스타일러스 가드(헤드셸 **아래**에 붙는다)
/** 파이프 원통감 — 길이 방향과 수직으로 흐르는 하이라이트. 꺾인 구간도 같은 값을 쓴다
 *  (회전 그룹 안에서는 'to right'가 자동으로 그 구간의 수직 방향이 된다). */
const TUBE_GRADIENT =
  "linear-gradient(to right, #141517 0%, #3f4247 28%, #7a7e85 50%, #2f3134 74%, #0d0e0f 100%)";
// 팁 = 피벗 + L·(−sinθ, cosθ) → 양수 θ가 팁을 왼쪽(판 안쪽)으로 보낸다.
const ARM_PLAY_DEG = 4; // 팁이 중심에서 약 0.86r — 첫 곡이 시작되는 바깥쪽 홈
const ARM_REST_DEG = -6; // 판 오른쪽 바깥 암 레스트에 park
// 드래그로 팔을 휘두를 수 있는 범위. 판을 넘어 왼쪽으로 넘어가거나 뒤로 꺾이지 않게 막는다.
const ARM_MIN_DEG = -14;
const ARM_MAX_DEG = 24;

function formatDuration(ms: number | null): string {
  if (!ms) return "";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function PlayIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

/** 재생 중인 곡 옆에서 춤추는 이퀄라이저 막대 (외부 라이브러리 없이 CSS 애니메이션). */
function Equalizer() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full bg-acc"
          style={{ animation: `haengwoon-eq 0.9s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </span>
  );
}

/**
 * 턴테이블: 커버(자켓)에서 LP가 오른쪽으로 빠져나오고, 재생 중이면 톤암이 판 위로 내려온다.
 * MD Vinyl처럼 "자켓 + 판 + 바늘"을 한 화면에 두되, 재생 상태에 따라 세 요소가 함께 반응한다.
 */
function Turntable({
  coverImageUrl,
  title,
  artist,
  spinning,
  lpColor,
  lpPattern,
  onNeedleDrop,
}: {
  coverImageUrl: string | null;
  title: string;
  artist: string;
  spinning: boolean;
  lpColor: string | null;
  lpPattern: string | null;
  /** 바늘을 판 위에 내려놓으면 true, 판 밖으로 치우면 false로 불린다. */
  onNeedleDrop: (onRecord: boolean) => void;
}) {
  const cover = useCoverColor(coverImageUrl);
  const surface = lpSurface(lpColor, lpPattern);
  const boxRef = useRef<HTMLDivElement>(null);
  const discBoxRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<HTMLDivElement>(null);
  // 커버를 누르면 판 위로 올라온다(다시 누르면 원래대로).
  const [coverOnTop, setCoverOnTop] = useState(false);
  // 드래그 중일 때만 각도를 직접 쥔다. null이면 재생 상태가 각도를 정한다.
  const [dragAngle, setDragAngle] = useState<number | null>(null);
  const angle = dragAngle ?? (spinning ? ARM_PLAY_DEG : ARM_REST_DEG);

  /** 톤암의 회전 중심(피벗)과 바늘까지의 길이를 지금 화면 크기에서 실측한다. */
  function armGeometry() {
    const box = boxRef.current;
    const arm = armRef.current;
    if (!box || !arm) return null;
    const r = box.getBoundingClientRect();
    return {
      px: r.right - r.width * ARM_RIGHT_PCT - ARM_WIDTH / 2,
      py: r.top + r.height * ARM_TOP_PCT,
      // offsetHeight는 회전과 무관한 레이아웃 높이 — rect를 쓰면 회전 때문에 값이 커진다
      len: arm.offsetHeight * (1 + STYLUS_OVERHANG_RATIO),
    };
  }

  /** 포인터 위치 → 톤암 각도(deg). 팁 = 피벗 + L·(−sinθ, cosθ) 관계를 뒤집은 것. */
  function angleFromPointer(clientX: number, clientY: number): number {
    const g = armGeometry();
    if (!g) return angle;
    const deg = (Math.atan2(-(clientX - g.px), clientY - g.py) * 180) / Math.PI;
    return Math.min(ARM_MAX_DEG, Math.max(ARM_MIN_DEG, deg));
  }

  /** 그 각도에서 바늘 끝이 판 위에 있는지. 판은 회전 중이라 지름은 offsetWidth로 잰다. */
  function isOnRecord(deg: number): boolean {
    const g = armGeometry();
    const disc = discBoxRef.current;
    if (!g || !disc) return false;
    const d = disc.getBoundingClientRect();
    const cx = d.left + d.width / 2;
    const cy = d.top + d.height / 2;
    const radius = disc.offsetWidth / 2;
    const rad = (deg * Math.PI) / 180;
    const tipX = g.px - g.len * Math.sin(rad);
    const tipY = g.py + g.len * Math.cos(rad);
    return Math.hypot(tipX - cx, tipY - cy) <= radius;
  }

  // 마우스로 바늘을 집어 판에 올리면 재생, 판 밖으로 치우면 정지.
  // window에 리스너를 붙이는 이유는 트랙 리스트 드래그와 같다 — setPointerCapture를 쓰면
  // 브라우저가 click 타깃을 캡처 요소로 바꿔버려 다른 컨트롤이 먹통이 된다.
  function onArmPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    setDragAngle(angleFromPointer(e.clientX, e.clientY));

    const move = (ev: PointerEvent) => setDragAngle(angleFromPointer(ev.clientX, ev.clientY));
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const finalDeg = angleFromPointer(ev.clientX, ev.clientY);
      setDragAngle(null); // 각도 결정권을 다시 재생 상태에 넘긴다
      onNeedleDrop(isOnRecord(finalDeg));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  return (
    // 넓은 화면에서는 왼쪽 영역을 통째로 쓰므로 판을 크게 키운다.
    // 내부 배치가 전부 %라서 크기가 변해도 톤암 각도(아래)를 다시 잡을 필요는 없다.
    <div
      ref={boxRef}
      className="relative aspect-[1.45/1] w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[580px] xl:max-w-[660px]"
    >
      {/* LP — 재생 중이면 자켓 밖으로 더 빠져나오면서 회전.
          z-[5]: 판이 자켓 **위로** 얹혀 돌아야 한다(턴테이블에 판을 올려둔 모습).
          예전엔 자켓이 뒤 DOM 순서라 판을 덮어, 판이 자켓 뒤로 들어간 것처럼 보였다.
          톤암(z-10)보다는 아래여야 바늘이 판 위에 놓인다. */}
      <div
        ref={discBoxRef}
        className="absolute top-1/2 aspect-square w-[62%] -translate-y-1/2 transition-[left] duration-700 ease-out"
        // 정지 시 판이 자켓 안으로 너무 깊이 들어가면, 바늘을 끌어다 올리려 해도 판에 닿지 않는다.
        // 30%→38%로 이동 폭을 줄여 멈춰 있을 때도 판이 충분히 나와 있게 한다.
        style={{ left: spinning ? "38%" : "30%", zIndex: coverOnTop ? 4 : 6 }}
      >
        {/* ring/그림자: 다크 모드에서 검은 판이 어두운 배경에 그대로 묻히는 걸 막는다.
            ★ Safari 대응: 판의 존재감을 그라디언트에 의존시키지 않는다. 예전엔 background 단축
            속성에 repeating-radial-gradient만 넣었는데, Safari가 이 촘촘한(2px) 반복 그라디언트를
            못 그리면 배경이 통째로 사라져 판이 아예 안 보였다(크롬은 정상). 그래서
            backgroundColor(단색)를 바닥에 깔고 그루브는 backgroundImage로 얹어, 그루브가 실패해도
            검은 원반은 반드시 보이게 한다. 그루브 간격도 3/6px로 넓혀 Safari 부담을 줄였다.
            translateZ(0)는 회전 애니메이션 중 배경이 깜빡이는 Safari 합성 이슈 예방용. */}
        {/* 판이 바닥에서 떠 있는 느낌을 내는 그림자.
            ★ 회전하는 판 자체에 box-shadow를 주면 안 된다 — 그림자도 같이 돌아서 판 둘레를
              빙빙 도는 이상한 그림이 된다(예전 shadow-xl이 그랬다). 돌지 않는 이 층에 얹는다.
            아래로 살짝 내려 깔아야 "떠 있다"로 읽힌다. */}
        {/* 그림자는 판 가장자리에서 곧바로 이어져야 한다.
            ★ 아래로 미는 양은 "offsetY − spread"가 전부다. 예전엔 레이어 자체를 10px 내리고
              그 위에 offsetY 22 / spread −14를 얹어 총 18px이 떠버렸고, 그 틈으로 배경이 비쳐
              그림자가 판에서 떨어져 어긋나 보였다. 지금은 10 − 10 = 0으로 딱 붙인다. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full shadow-[0_10px_26px_-10px_rgba(0,0,0,0.5)] dark:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.8)]"
          aria-hidden="true"
        />
        <div
          className="relative h-full w-full rounded-full ring-1 ring-black/20 dark:ring-white/15"
          style={{
            // 색·무늬는 관리자가 앨범별로 지정한 값에서 온다. lpSurface가 단색(backgroundColor)과
            // 무늬(backgroundImage)를 분리해 돌려주므로 위의 Safari 대비도 그대로 유지된다.
            backgroundColor: surface.backgroundColor,
            backgroundImage: surface.backgroundImage,
            animation: "haengwoon-spin 5s linear infinite",
            animationPlayState: spinning ? "running" : "paused",
            transform: "translateZ(0)",
            willChange: "transform",
          }}
        >
          {/* 픽쳐 디스크 — 커버가 판 면에 인쇄된 판. 배경 그라디언트로는 그림을 못 넣으니
              이미지 레이어를 따로 깔고, 그 위에 어두운 홈을 얹어 "인쇄된 판"으로 읽히게 한다
              (밝은 그림 위에서는 기본 흰 홈이 보이지 않는다). */}
          {surface.picture && coverImageUrl && (
            <>
              <Image
                src={coverImageUrl}
                alt=""
                fill
                sizes="500px"
                className="pointer-events-none rounded-full object-cover"
              />
              {/* 홈 + 테두리. 자켓과 같은 그림이 판에도 인쇄돼 있어, 판이 자켓에 겹치는
                  왼쪽에서는 원의 경계가 사라진다. 안쪽 테두리를 넣어 "판"임을 잃지 않게 한다. */}
              <div
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  backgroundImage: surface.pictureGrooves,
                  boxShadow: "inset 0 0 0 3px rgba(0,0,0,0.35), inset 0 0 22px rgba(0,0,0,0.28)",
                }}
              />
            </>
          )}

          {/* 가운데 라벨 — 실제 LP처럼 커버에서 뽑은 색 위에 제목·아티스트를 찍는다.
              커버 이미지를 그대로 넣으면 왼쪽 자켓과 똑같은 그림이 두 번 나와 단조롭고,
              작게 줄어든 사진은 어차피 알아보기도 어렵다. 스핀들 홀을 사이에 두고
              위에 제목 / 아래 아티스트 — 라벨이 판과 함께 도는 것도 실물 그대로다. */}
          <div
            // ★ 여기에 px-[%]를 주면 안 된다. 퍼센트 패딩은 자기 너비가 아니라 **포함 블록(LP판)**의
            //   너비를 기준으로 계산돼서, px-[9%]가 판 지름의 9%(라벨 지름의 25%)만큼 들어가버린다.
            //   그러면 라벨 내용 영역이 반토막 나고, 그 안의 w-[12%]와 h-[12%]가 서로 다른 기준을
            //   잡아 스핀들 홀이 2:1 세로 타원이 됐다. 여백은 안쪽 요소의 너비로 대신 만든다.
            className="absolute left-1/2 top-1/2 flex h-[36%] w-[36%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-[5%] overflow-hidden rounded-full ring-1 ring-black/40"
            style={{ backgroundColor: cover?.spine ?? "#d9d6ce" }}
          >
            <span
              className="w-[78%] truncate text-center text-[7px] font-bold uppercase leading-tight tracking-tight sm:text-[8px] lg:text-[11px]"
              style={{ color: cover?.ink ?? "rgba(0,0,0,0.72)" }}
            >
              {title}
            </span>
            {/* 스핀들 홀 — 라벨 지름의 12%(= 판 지름의 4.3%)로 실물 비율에 맞춘다.
                너비를 %로 따로 주지 않고 aspect-square로 높이에 맞춘다 — 가로·세로가 각각
                다른 기준으로 계산될 여지를 없애 어떤 경우에도 정원(正圓)을 보장한다. */}
            <span className="aspect-square h-[12%] shrink-0 rounded-full bg-bg ring-1 ring-black/50" />
            <span
              className="w-[78%] truncate text-center text-[6px] leading-tight opacity-80 sm:text-[7px] lg:text-[9px]"
              style={{ color: cover?.ink ?? "rgba(0,0,0,0.72)" }}
            >
              {artist}
            </span>
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
        </div>
      </div>

      {/* 자켓(커버) — 판과 같은 크기. 누르면 판 위/아래를 오간다.
          기본은 판이 위(턴테이블에 판을 얹은 모습)지만, 커버 그림을 통째로 보고 싶을 때가 있어
          커버를 누르면 앞으로 나오게 했다. 한 번 더 누르면 원래대로. */}
      <button
        type="button"
        onClick={() => setCoverOnTop((v) => !v)}
        aria-label={coverOnTop ? `${title} 커버 뒤로 보내기` : `${title} 커버 앞으로 가져오기`}
        aria-pressed={coverOnTop}
        className="absolute left-0 top-1/2 aspect-square w-[62%] -translate-y-1/2 cursor-pointer"
        style={{ zIndex: coverOnTop ? 6 : 4 }}
      >
        {/* 움직임은 이 안쪽 층에서만 준다.
            ① 버튼에는 -translate-y-1/2가 걸려 있어 여기에 transform을 또 쓰면 서로 덮어쓴다.
            ② 앞으로 나올 때 살짝 커지므로 잘림 방지를 위해 overflow-hidden도 안쪽으로 옮겼다.
            판 쪽(오른쪽)으로 밀며 커지는 움직임이라 "자켓을 집어 앞으로 빼든다"로 읽힌다. */}
        {/* 살짝 기울여 둔다 — 자로 잰 듯 반듯하면 "합성한 그림"처럼 보이는데, 몇 도만 틀어도
            테이블에 툭 올려둔 물건처럼 읽힌다. 앞으로 꺼낼 때는 각도를 거의 펴서(-1deg)
            "집어서 똑바로 든다"는 느낌을 준다. */}
        <div
          className={
            "relative h-full w-full overflow-hidden rounded-[3px] transition-[transform,box-shadow] duration-500 ease-out " +
            (coverOnTop ? "shadow-[0_18px_50px_rgba(0,0,0,0.45)]" : "shadow-2xl")
          }
          style={{
            transform: coverOnTop
              ? "translateX(8%) scale(1.05) rotate(-1deg)"
              : "translateX(0) scale(1) rotate(-3.5deg)",
          }}
        >
          {coverImageUrl ? (
            <Image src={coverImageUrl} alt={title} fill sizes="400px" className="object-cover" priority />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-card text-3xl font-bold text-mut">
              {title.slice(0, 1)}
            </div>
          )}
          {/* 커버 위에 어둡게 까는 층은 두지 않는다(우하단 그늘, 왼쪽 접힘 그림자 모두 제거).
              입체감은 자켓 뒤로 드리우는 그림자(위 shadow-*)가 이미 내주는데, 그림 위에까지
              검은 기울기를 얹으면 커버 아트만 탁해진다. 남긴 건 좌상단 하이라이트뿐 —
              진열대 케이스와 같은 처리다. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
        </div>
      </button>

      {/* 톤암 베이스(피벗 어셈블리) — ★ 회전하는 암 본체와 **일부러 분리**한 레이어다.
          실물에서 베어링·마운트 플레이트는 플래터 옆 플린스에 박혀 있으므로 판보다 아래에
          있어야 하고, 판 위를 지나가는 건 파이프~바늘뿐이다. 예전엔 이것들이 암 래퍼(z-10)
          안에 같이 있어서 재생 중 판이 오른쪽으로 나오면 베이스가 판을 덮어버렸다.
          그래서 여기만 판(z-4/6)보다 낮은 z-[2]로 내린다.

          두 부품 다 피벗을 중심으로 한 정원(正圓)이라 회전시켜도 그림이 똑같다 —
          회전 래퍼 밖으로 빼도 시각적으로 잃는 게 없다. 위치 기준(right/top/width)은
          암 래퍼와 정확히 같은 값을 써서 피벗이 어긋나지 않게 한다. */}
      <div
        className="pointer-events-none absolute z-[2] text-[12.5px] sm:text-[14px] lg:text-[24px] xl:text-[27.5px]"
        style={{
          right: `${ARM_RIGHT_PCT * 100}%`,
          top: `${ARM_TOP_PCT * 100}%`,
          width: ARM_WIDTH,
        }}
        aria-hidden="true"
      >
        {/* 마운트 플레이트 — 플린스에 박힌 원판(ref 225px → 3.8em).
            바깥 테두리에 얇은 하이라이트를 둘러 가공된 금속판처럼 각을 세운다. */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "3.8em",
            height: "3.8em",
            backgroundImage:
              "radial-gradient(circle at 36% 28%, #4d4e54 0%, #424349 42%, #37383e 74%, #2b2c31 100%)",
            boxShadow:
              "0 0.08em 0.18em rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.09), inset 0 -0.06em 0.12em rgba(0,0,0,0.35)",
          }}
        />

        {/* 플레이트에 새겨진 동심 홈 — 단색 원판이면 플라스틱 스티커처럼 보인다.
            선 하나로 "깎아낸 금속"의 인상이 생긴다. */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "2.95em",
            height: "2.95em",
            boxShadow:
              "inset 0 0 0 1px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        />

        {/* 베어링 하우징(바깥) — 위에서 빛을 받는 금속 원통. 단순 border로는 한쪽만 밝은
            원통감이 안 나와서, 사선 그라디언트 원판 위에 어두운 보어를 얹는 방식으로 만든다. */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "1.87em",
            height: "1.87em",
            backgroundImage:
              "linear-gradient(148deg, #9195a0 0%, #6e7178 26%, #4b4d53 55%, #303237 80%, #24262a 100%)",
            boxShadow:
              "0 0.06em 0.14em rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.14)",
          }}
        />

        {/* 베어링 보어 — 안쪽으로 파인 어두운 구멍. 위쪽 안쪽에 반사광을 남겨 깊이를 준다. */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "1.16em",
            height: "1.16em",
            backgroundImage:
              "radial-gradient(circle at 50% 76%, #2a2c31 0%, #1b1c20 55%, #101113 100%)",
            boxShadow:
              "inset 0 0.06em 0.1em rgba(0,0,0,0.8), inset 0 -0.04em 0.06em rgba(255,255,255,0.10)",
          }}
        />

        {/* 축 캡(중심 나사) — 회전축의 정중앙. 이게 있어야 "여기가 회전 중심"으로 읽힌다. */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "0.5em",
            height: "0.5em",
            backgroundImage:
              "radial-gradient(circle at 38% 30%, #a8abb3 0%, #74777e 45%, #45474c 100%)",
            boxShadow: "0 0.02em 0.05em rgba(0,0,0,0.6)",
          }}
        />
      </div>

      {/* 톤암 — 피벗에서 아래로 늘어뜨린 구조 전체를 회전시킨다(origin: top center).
          정지 시 거의 수직으로 판 바깥(암 레스트)에, 재생 시 안쪽으로 swing해 판 위에 얹힌다.
          기하를 "한 덩어리 + 회전"으로 유지해야 각도를 바꿔도 부품 위치가 안 틀어진다.
          금속 질감은 좌우로 흐르는 밝기 그라디언트(위→아래가 아니라 가로 방향)로 낸다 —
          원통에 빛이 스치는 하이라이트가 입체감의 핵심. */}
      <div
        ref={armRef}
        onPointerDown={onArmPointerDown}
        // 장식이 아니라 집어서 옮길 수 있는 물건이 됐다. 다만 같은 동작(재생/정지)은 옆의
        // "전체 재생" 버튼으로 키보드·보조기술에서 이미 가능하므로, 여기서는 중복 컨트롤로
        // 두고 aria-hidden을 유지한다(키보드로 각도를 미세 조정하게 만드는 건 과하다).
        className={
          // font-size = 암 길이의 약 1/10. 아래 부품들이 전부 em이라 이 한 줄로 화면
          // 크기에 맞춰 톤암 전체가 비례 축소된다(고정 px면 작은 화면에서 판을 덮는다).
          "absolute z-10 touch-none text-[12.5px] sm:text-[14px] lg:text-[24px] xl:text-[27.5px] " +
          (dragAngle === null ? "cursor-grab transition-transform duration-700 ease-out" : "cursor-grabbing")
        }
        style={{
          right: `${ARM_RIGHT_PCT * 100}%`,
          top: `${ARM_TOP_PCT * 100}%`,
          width: ARM_WIDTH,
          height: "58%",
          transformOrigin: "top center",
          // 각도 근거는 파일 상단 "톤암 기하" 주석 참고. 드래그 중이면 손이 각도를 쥔다.
          // (피벗 좌표를 rect로 재면 안 된다 — 회전된 요소의 getBoundingClientRect는 회전 후의
          //  축정렬 박스라 피벗이 아니다. 그래서 armGeometry()는 컨테이너 rect + %로 계산한다.)
          transform: `rotate(${angle}deg)`,
          filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))",
        }}
        aria-hidden="true"
      >
        {/* ── 부품 치수는 Sony PS-LX5BT 실사진을 실측해 우리 판 크기로 환산한 값 ──────────
            레퍼런스(판 800px / 암 560px)와 우리(판 409px / 암 277px)의 암:판 비율이
            0.70 : 0.68로 거의 같아, 레퍼런스 치수 × 0.495를 그대로 쓰면 비율이 맞는다.
            단위는 px가 아니라 em(래퍼 font-size ≈ 암 길이/10)이라 화면이 줄면 같이 줄어든다.

            ★ 배치의 핵심: 실기는 파이프가 베어링 원의 **오른쪽**을 지나 아래로 내려오면서
              왼쪽으로 휘어 바늘이 축 바로 아래에 떨어지는 J자다. 이 "바늘 = 축 바로 아래"는
              멋이 아니라 armGeometry()의 팁 계산 전제(팁 = 피벗 + L·(−sinθ, cosθ))라
              반드시 지켜야 한다. 그래서 휘어짐을 넣어도 팁은 래퍼 바닥 중앙에 둔다. */}

        {/* 암 파이프(직선부) — 피벗 축에서 오른쪽으로 TUBE_DX만큼 벗어나 지나가고,
            피벗보다 위로도 조금 올라간다(뒤쪽 파이프). 실기도 베어링이 파이프 중간에 물려 있다. */}
        <div
          className="absolute rounded-full"
          style={{
            left: `calc(50% + ${TUBE_DX}em)`,
            top: `-${TUBE_REAR}em`,
            width: `${TUBE_W}em`,
            height: `calc(${BEND_TOP}% + ${TUBE_REAR}em)`,
            transform: "translateX(-50%)",
            backgroundImage: TUBE_GRADIENT,
          }}
        />

        {/* 피벗 옆 수평 스터브 — 파이프 오른쪽으로 짧게 튀어나온 축(ref 32px). */}
        <div
          className="absolute rounded-[0.08em]"
          style={{
            left: `calc(50% + ${TUBE_DX + 0.16}em)`,
            top: "-0.21em",
            width: "0.62em",
            height: "0.42em",
            backgroundImage: "linear-gradient(to bottom, #5b5d64 0%, #3a3b3f 55%, #202124 100%)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.45)",
          }}
        />

        {/* 암 리프트 레버 — 파이프 중간 오른쪽 돌기. */}
        <div
          className="absolute rounded-[0.06em]"
          style={{
            left: `calc(50% + ${TUBE_DX + 0.1}em)`,
            top: "48%",
            width: "0.5em",
            height: "0.19em",
            backgroundImage: "linear-gradient(to bottom, #55565c 0%, #2c2d31 100%)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        />

        {/* ★ 꺾인 끝단 — 파이프 끝 BEND_DEG(24°) 꺾임부터 헤드셸·가드까지 한 그룹으로 회전.
            한 덩어리로 돌려야 각 부품이 같은 축 위에 정확히 이어진다(따로 돌리면 이음매가 어긋난다).
            그룹 길이(BENT_LEN+HS_LEN+GUARD_LEN)와 꺾임 위치는 바늘 끝이 래퍼 바닥 중앙에
            떨어지도록 역산한 값이다 — armGeometry()의 팁 공식이 그걸 전제로 한다. */}
        <div
          className="absolute"
          style={{
            left: `calc(50% + ${TUBE_DX}em)`,
            top: `${BEND_TOP}%`,
            width: 0,
            height: 0,
            transform: `rotate(${BEND_DEG}deg)`,
            transformOrigin: "top center",
          }}
        >
          {/* 꺾인 파이프 */}
          <div
            className="absolute rounded-full"
            style={{
              left: 0,
              top: "-0.1em",
              width: `${TUBE_W}em`,
              height: `${BENT_LEN + 0.1}em`,
              transform: "translateX(-50%)",
              backgroundImage: TUBE_GRADIENT,
            }}
          />

          {/* 헤드셸 — 1:2 세로로 긴 블록. 파이프 끝에 물린 카트리지 하우징. */}
          <div
            className="absolute"
            style={{
              left: 0,
              top: `${BENT_LEN}em`,
              width: `${HS_W}em`,
              height: `${HS_LEN}em`,
              transform: "translateX(-50%)",
              borderRadius: "0.09em",
              backgroundImage:
                "linear-gradient(to right, #16171a 0%, #3a3c41 26%, #55575e 50%, #2b2d31 76%, #131416 100%)",
              boxShadow: "0 0.06em 0.12em rgba(0,0,0,0.55), inset 0 0.04em 0 rgba(255,255,255,0.12)",
            }}
          >
            {/* 카트리지 고정 나사 2개 — 길이 방향으로 앞뒤 배치(실기 1/2인치 마운트 규격).
                예전엔 폭 방향으로 흩어놔서 나사로 안 보였다. */}
            <span
              className="absolute left-1/2 -translate-x-1/2 rounded-full"
              style={{
                top: "20%",
                width: "0.17em",
                height: "0.17em",
                backgroundColor: "#0d0e10",
                boxShadow: "inset 0 0.02em 0.03em rgba(255,255,255,0.22)",
              }}
            />
            <span
              className="absolute left-1/2 -translate-x-1/2 rounded-full"
              style={{
                top: "52%",
                width: "0.17em",
                height: "0.17em",
                backgroundColor: "#0d0e10",
                boxShadow: "inset 0 0.02em 0.03em rgba(255,255,255,0.22)",
              }}
            />
          </div>

          {/* 노란 스타일러스 가드 — 헤드셸 **바로 아래**에 붙는다(옆이 아니라). */}
          <div
            className="absolute"
            style={{
              left: 0,
              top: `${BENT_LEN + HS_LEN}em`,
              width: `${HS_W * 0.66}em`,
              height: `${GUARD_LEN}em`,
              transform: "translateX(-50%)",
              borderRadius: "0.04em 0.04em 0.06em 0.06em",
              backgroundImage: "linear-gradient(to bottom, #dcc65a 0%, #c1a63a 60%, #9c7f22 100%)",
              boxShadow: "0 0.04em 0.08em rgba(0,0,0,0.45)",
            }}
          />

          {/* 핑거 리프트 — 헤드셸 옆구리에서 바깥으로 뻗은 밝은 은색 막대. */}
          <div
            className="absolute rounded-full"
            style={{
              left: `${HS_W * 0.42}em`,
              top: `${BENT_LEN + HS_LEN * 0.62}em`,
              width: "0.78em",
              height: "0.13em",
              backgroundImage: "linear-gradient(to bottom, #c2c3c9 0%, #8b8c92 55%, #5c5d62 100%)",
              boxShadow: "0 0.03em 0.06em rgba(0,0,0,0.4)",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes haengwoon-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes haengwoon-eq { 0%,100% { height: 25%; } 50% { height: 100%; } }
      `}</style>
    </div>
  );
}

export function AlbumPlayerView({ albumId, onClose }: { albumId: number; onClose: () => void }) {
  const { current, isPlaying, play, playQueue, pause, fullPlayback } = useAudioPlayer();
  const [album, setAlbum] = useState<PlayerAlbum | null>(null);
  const [tracks, setTracks] = useState<PlayerTrack[]>([]);
  // 초기값 true — 이펙트 안에서 동기적으로 setLoading(true)를 부르면 불필요한 연쇄 렌더가 생긴다.
  // 앨범이 바뀔 땐 호출측에서 key로 새로 마운트시키므로 여기서 다시 true로 돌릴 필요가 없다.
  const [loading, setLoading] = useState(true);
  const [showSpotify, setShowSpotify] = useState(false);

  // 수록곡 리스트를 마우스로 붙잡아 훑을 수 있게 한다(페이지 전체가 아니라 리스트 안에서만 움직임).
  // 렌더 결과에 영향을 주지 않는 순수 제스처 상태라 state가 아니라 ref로 들고 간다 —
  // 드래그 중 매 프레임 리렌더가 나면 목록이 길수록 눈에 띄게 버벅인다.
  const listRef = useRef<HTMLUListElement>(null);
  const drag = useRef({ moved: 0 });
  // 드래그 중 붙인 window 리스너를 떼는 함수. 드래그 도중 컴포넌트가 사라져도 새지 않도록 보관.
  const detachDrag = useRef<(() => void) | null>(null);
  useEffect(() => () => detachDrag.current?.(), []);

  function onListPointerDown(e: React.PointerEvent<HTMLUListElement>) {
    drag.current.moved = 0; // 어떤 입력이든 새 조작이 시작되면 초기화
    // 터치·펜은 브라우저 기본 관성 스크롤이 훨씬 자연스럽다 — 가로채지 않는다
    if (e.pointerType !== "mouse") return;
    const el = listRef.current;
    if (!el) return;

    const startY = e.clientY;
    const startTop = el.scrollTop;

    // ★ setPointerCapture를 쓰면 안 된다. 캡처가 걸린 채로 포인터를 떼면 브라우저가 click의
    //   타깃을 캡처 요소(=이 <ul>)로 바꿔버려서, 곡을 누르기만 해도 트랙 버튼의 onClick이
    //   아예 실행되지 않는다(실제로 그렇게 먹통이 됐다). window 리스너로 붙이면 포인터가
    //   리스트 밖으로 나가도 따라오면서 click 타깃은 원래 버튼 그대로 유지된다.
    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      drag.current.moved = Math.max(drag.current.moved, Math.abs(dy));
      el.scrollTop = startTop - dy;
    };
    const onUp = () => detachDrag.current?.();

    detachDrag.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      detachDrag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  // 훑기로 끝난 조작은 클릭으로 치지 않는다 — 목록을 넘기다 엉뚱한 곡이 재생되면 당황스럽다.
  // 캡처 단계에서 가로채야 각 트랙 버튼의 onClick에 도달하기 전에 막을 수 있다.
  function onListClickCapture(e: React.MouseEvent) {
    if (drag.current.moved > 5) {
      e.preventDefault();
      e.stopPropagation();
    }
    drag.current.moved = 0;
  }

  useEffect(() => {
    let alive = true;
    fetch(`/api/albums/${albumId}/tracks`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.ok) return;
        setAlbum(d.album);
        setTracks(d.tracks);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [albumId]);

  // Esc로 닫기 — 모달성 UI의 기본 기대 동작
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const playable = useCallback(
    (): NowPlayingTrack[] =>
      tracks
        .filter((t): t is PlayerTrack & { previewUrl: string } => Boolean(t.previewUrl))
        .map((t) => ({
          id: t.id,
          title: t.title,
          artist: album?.artist ?? "",
          coverImageUrl: album?.coverImageUrl ?? null,
          previewUrl: t.previewUrl,
        })),
    [tracks, album]
  );

  // 이 앨범의 곡이 지금 재생 중인지 — 판 회전·톤암·전체재생 버튼 상태를 함께 결정한다
  // 미리듣기(Deezer)로 이 앨범의 곡이 재생 중인지 — "전체 재생" 버튼의 상태를 결정한다.
  const previewPlaying = isPlaying && tracks.some((t) => t.id === current?.id);
  // Spotify 전곡 재생 중인지. 이 뷰가 열려 있는 동안 등록되는 건 이 앨범의 플레이어뿐이다.
  const spotifyPlaying = !!fullPlayback && !fullPlayback.isPaused;
  // 판과 톤암은 "소리가 나고 있는가"만 보면 된다 — 음원이 Deezer든 Spotify든 상관없이 돈다.
  // (버튼 상태와 분리해 두는 게 중요하다. 버튼은 Deezer 큐만 제어하므로, Spotify 재생 중에
  //  버튼까지 '일시정지'로 바뀌면 눌러도 아무 일이 없는 죽은 컨트롤이 된다.)
  const spinning = previewPlaying || spotifyPlaying;
  const hasPreview = tracks.some((t) => t.previewUrl);

  // Spotify는 앨범을 통째로 걸어두면 곡이 알아서 넘어가는데, 우리 화면에는 앨범 제목만 떠 있어
  // 지금 무슨 곡인지 알 수가 없었다. 그래서 어느 수록곡인지 되짚는다 — 두 단계로.
  const spotifyTrack = (() => {
    if (!fullPlayback) return null;

    // ① 트랙 ID가 오면 그게 가장 정확하다. 미리듣기 모드에서는 이 경로로 잘 잡힌다.
    if (fullPlayback.trackId) {
      const byId = tracks.find((t) => t.spotifyTrackId === fullPlayback.trackId);
      if (byId) return byId;
    }

    // ② ID로 못 찾는 경우가 실제로 있다(전곡 재생에서 playingURI가 오지 않거나, 국가별
    //    리링크로 같은 곡이라도 ID가 달라짐). 이때는 재생 길이로 되짚는다.
    //    양쪽 길이 모두 Spotify에서 온 같은 값이라 거의 정확히 일치한다 — 화면에 3:53과 3:54로
    //    다르게 보이는 건 내림/반올림 차이일 뿐이다. 그래서 허용 오차를 넉넉히 두면 안 된다.
    //    실측: 이번 달 추천 140곡 기준 겹치는 쌍이 ±2초 30개 / ±1초 13개 / ±0.3초 3개.
    //    미리듣기 클립(30초 안팎)은 곡 길이가 아니므로 애초에 제외한다.
    const dur = fullPlayback.duration;
    if (!dur || dur <= PREVIEW_MAX_SEC) return null;

    const TOLERANCE_MS = 300;
    let best: PlayerTrack | null = null;
    let bestDiff = Infinity;
    let runnerUpDiff = Infinity;
    for (const t of tracks) {
      if (!t.durationMs) continue;
      const diff = Math.abs(t.durationMs - dur * 1000);
      if (diff < bestDiff) {
        runnerUpDiff = bestDiff;
        bestDiff = diff;
        best = t;
      } else if (diff < runnerUpDiff) {
        runnerUpDiff = diff;
      }
    }
    // 길이가 비슷한 곡이 둘 이상이면 찍지 않는다 — 엉뚱한 곡을 초록으로 물들이는 것보다
    // 아무 표시도 없는 편이 낫다(잘못된 정보가 더 나쁘다).
    if (bestDiff > TOLERANCE_MS || runnerUpDiff <= TOLERANCE_MS) return null;
    return best;
  })();

  // 리스트에는 일곱 곡만 보이므로, Spotify가 다음 곡으로 넘어가면 그 줄이 화면 밖일 수 있다.
  // 곡이 바뀔 때만(트랙 id 기준) 안 보이는 경우에 한해 끌어와 하이라이트가 늘 눈에 띄게 한다.
  // block:"nearest" — 이미 보이면 스크롤하지 않으므로 손으로 훑는 중에 튀지 않는다.
  const spotifyRowRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    spotifyRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [spotifyTrack?.id]);

  return (
    // 본문 기본 폭(max-w-3xl)이나 기존 5xl에 맞추지 않는다 — 이 화면은 "턴테이블 + 수록곡"
    // 두 덩어리를 좌우로 펼치는 게 전부라, 폭이 좁으면 판을 크게 못 키우고 리스트도 답답해진다.
    <div className="mx-auto w-full max-w-[1500px] px-5 sm:px-8 lg:px-14">
      {/* 카드(테두리·배경) 없이 페이지 위에 그대로 올린다 — 진열대에서 이어지는 화면이라
          박스로 한 번 더 가두면 앱 같은 흐름이 끊긴다. */}
      <div className="relative">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-0 top-0 z-10 rounded-full p-2 text-mut transition-colors hover:bg-card hover:text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        {loading || !album ? (
          <p className="py-20 text-center text-sm text-mut">불러오는 중…</p>
        ) : (
          // 넓은 화면에서는 왼쪽 = 턴테이블만, 오른쪽 = 제목/아티스트 → 버튼 → 수록곡.
          // 정보와 조작을 리스트 위에 모아두면 시선이 오른쪽 한 줄기로 흐르고, 왼쪽은
          // "지금 돌아가는 판"만 보여주는 무대가 된다. 좁은 화면에서는 그대로 위아래로 쌓인다.
          // pt-10: 세로로 쌓이는 좁은 화면에선 턴테이블이 맨 위에 오는데, 그 오른쪽 위가 마침
          // 톤암 피벗 자리라 우상단 닫기 버튼과 겹친다. 한 줄 비워 버튼 자리를 확보한다.
          // 넓은 화면에선 닫기 버튼이 오른쪽 칼럼의 제목 옆에 놓이므로 필요 없다.
          <div className="flex flex-col items-center gap-10 pt-10 lg:flex-row lg:items-start lg:gap-14 lg:pt-0 xl:gap-20">
            {/* 왼쪽: 턴테이블. 리스트가 길어도 판은 화면에 남아 있도록 sticky */}
            {/* 판을 오른쪽 칼럼 시작선 가까이(mt-4) 올린다. 이전에는 lg:top-24가 96px 아래로
                밀고 있었는데, 화면 하단에 떠 있는 재생바(약 80px)까지 아래 공간을 먹어 판이
                눌려 보였다. 96px → 16px로 줄여 딱 재생바 높이만큼 끌어올린 셈.
                ★ 예전에 있던 lg:sticky lg:top-24는 지워도 무방했다 — /music 섹션의
                  overflow-hidden이 sticky의 스크롤포트가 되어 실제로는 한 번도 고정된 적이 없고
                  (스크롤하면 그대로 따라 올라가 헤더 밑으로 들어감), 아래로 미는 역할만 했다.
                  margin으로 올리려 해도 sticky의 top이 이겨서 먹히지 않는다.
                세로로 쌓이는 좁은 화면에서는 판이 이미 맨 위라 적용하지 않는다. */}
            <div className="flex w-full shrink-0 justify-center lg:mt-4 lg:w-[60%] lg:justify-start">
              <Turntable
                coverImageUrl={album.coverImageUrl}
                title={album.title}
                artist={album.artist}
                spinning={spinning}
                lpColor={album.lpColor}
                lpPattern={album.lpPattern}
                // 바늘을 판에 올리면 재생, 판 밖으로 치우면 정지 — 실물을 다루는 감각 그대로.
                // 이미 그 상태면 아무것도 하지 않는다(판 위에서 놓았는데 다시 첫 곡으로
                // 되감기면 당황스럽다).
                onNeedleDrop={(onRecord) => {
                  if (onRecord) {
                    if (spinning) return;
                    if (spotifyPlaying) fullPlayback?.togglePlay();
                    playQueue(playable());
                  } else {
                    if (previewPlaying) pause();
                    if (spotifyPlaying) fullPlayback?.togglePlay();
                  }
                }}
              />
            </div>

            {/* 오른쪽: 앨범 정보 → 버튼 → 수록곡 */}
            <div className="min-w-0 w-full flex-1">
              {/* pr-12: 우측 상단 닫기 버튼과 겹치지 않도록 자리를 비워둔다 */}
              <div className="pr-12 text-center lg:text-left">
                <h2 className="text-2xl font-bold leading-tight xl:text-3xl">{album.title}</h2>
                <Link
                  href={`/artist/${encodeURIComponent(album.artist)}`}
                  className="mt-1.5 inline-block text-sm text-mut hover:text-fg hover:underline"
                >
                  {album.artist}
                </Link>

                {/* 전곡 재생 중 지금 울리는 곡. 앨범 재생은 곡이 자동으로 넘어가므로
                    제목만 보고는 어디쯤인지 알 수 없다. 미리듣기일 땐 리스트에서 이미
                    이퀄라이저로 표시되므로 여기엔 띄우지 않는다. */}
                {spotifyTrack && (
                  <p className="mt-2 flex items-center justify-center gap-2 text-sm lg:justify-start">
                    <Equalizer />
                    <span className="tabular-nums text-mut">
                      {String(spotifyTrack.trackNumber).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 truncate font-medium text-acc">{spotifyTrack.title}</span>
                  </p>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                {hasPreview && (
                  <button
                    onClick={() => {
                      if (previewPlaying) return pause();
                      // Spotify가 울리는 중에 미리듣기를 얹으면 두 음원이 겹친다 — 먼저 멈춘다.
                      if (spotifyPlaying) fullPlayback?.togglePlay();
                      playQueue(playable());
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-acc px-5 py-2.5 text-sm font-semibold text-on-acc"
                  >
                    {previewPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                    {previewPlaying ? "일시정지" : "전체 재생"}
                  </button>
                )}
                <Link
                  href={`/music/album/${album.spotifyAlbumId ?? album.id}`}
                  className="rounded-full border border-line px-4 py-2.5 text-sm text-mut hover:border-acc hover:text-fg"
                >
                  앨범 상세
                </Link>
              </div>

              <div className="mb-1 mt-8 flex items-baseline justify-between border-b border-line/60 pb-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-mut">
                  Tracks
                </h3>
                <span className="text-[11px] tabular-nums text-mut/60">{tracks.length}</span>
              </div>

              {/* 리스트는 자기 영역 안에서만 스크롤한다(페이지가 통째로 밀리지 않도록
                  overscroll-contain). 마우스로는 붙잡아 끌어서, 그 외에는 휠·터치로 넘긴다.
                  스크롤바는 숨기고 grab 커서로 "잡을 수 있다"는 신호를 준다. */}
              <ul
                ref={listRef}
                onPointerDown={onListPointerDown}
                onClickCapture={onListClickCapture}
                // 높이는 "일곱 곡이 보이는 만큼"으로 고정한다. FAVORITE 라벨을 뺀 뒤로 모든 줄의
                // 높이가 같아졌다(약 49px). 357px면 7줄이 온전히 들어가고 여덟 번째 줄이 살짝
                // 걸치는데, 이 잘린 줄이 "더 있으니 끌어보라"는 신호가 된다.
                className={
                  "max-h-[357px] select-none divide-y divide-line/60 overflow-y-auto overscroll-contain " +
                  "cursor-grab active:cursor-grabbing " +
                  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                }
              >
                {tracks.map((t) => {
                  // 미리듣기(Deezer)로 고른 곡. Spotify가 울리는 동안에는 표시하지 않는다 —
                  // current는 재생이 끝나도 마지막에 고른 곡을 계속 가리켜서, 그대로 두면
                  // "소리는 2번 곡인데 5번 곡이 초록"인 상태가 된다(실제로 그렇게 보였다).
                  const isThis = current?.id === t.id && !spotifyPlaying;
                  // Spotify 전곡 재생이 지금 울리고 있는 곡. 앨범을 통째로 걸면 곡이 알아서
                  // 넘어가는데, 리스트에 아무 표시가 없으면 어디를 듣고 있는지 알 수 없다.
                  // 미리듣기를 건드리지 않고 표시만 옮겨준다(소리는 Spotify 쪽에서 계속 남).
                  const isSpotifyThis = spotifyTrack?.id === t.id;
                  const highlighted = isThis || isSpotifyThis;
                  const nowPlaying = (isThis && isPlaying) || (isSpotifyThis && spotifyPlaying);
                  return (
                    <li key={t.id} ref={isSpotifyThis ? spotifyRowRef : undefined}>
                      <button
                        onClick={() =>
                          t.previewUrl &&
                          play({
                            id: t.id,
                            title: t.title,
                            artist: album.artist,
                            coverImageUrl: album.coverImageUrl,
                            previewUrl: t.previewUrl,
                          })
                        }
                        disabled={!t.previewUrl}
                        className={
                          "group flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors " +
                          (highlighted
                            ? "bg-acc/8"
                            : "hover:bg-bg/60 disabled:opacity-35 disabled:hover:bg-transparent")
                        }
                      >
                        {/* 번호 ↔ 재생아이콘 ↔ 이퀄라이저 */}
                        <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                          {nowPlaying ? (
                            <Equalizer />
                          ) : (
                            <>
                              <span className="text-xs tabular-nums text-mut/70 group-hover:opacity-0">
                                {String(t.trackNumber).padStart(2, "0")}
                              </span>
                              {t.previewUrl && (
                                <span className="absolute inset-0 flex items-center justify-center text-fg opacity-0 group-hover:opacity-100">
                                  <PlayIcon size={14} />
                                </span>
                              )}
                            </>
                          )}
                        </span>

                        {/* 최애곡 표시는 초록 별로 충분하다 — FAVORITE 라벨까지 붙이면 그 줄만
                            높이가 달라져 목록의 리듬이 깨지고, 같은 정보가 두 번 나온다. */}
                        <span className="min-w-0 flex-1">
                          <span
                            className={
                              "block truncate text-[15px] leading-tight " +
                              (highlighted ? "font-semibold text-acc" : "font-medium")
                            }
                          >
                            {t.title}
                          </span>
                        </span>

                        {/* 별은 평점이 있을 때만 자리를 차지하게 — 빈 칸이 제목 폭을 잡아먹지 않도록 */}
                        {!!t.manualRating && (
                          <span className="shrink-0">
                            <TrackTierStars tier={t.manualRating} isFavorite={t.isFavorite} />
                          </span>
                        )}
                        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-mut/70">
                          {formatDuration(t.durationMs)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {hasPreview && (
                <p className="mt-3 text-[11px] text-mut/60">미리듣기 30초 · Deezer</p>
              )}

              {/* 전곡 듣기 — 자체 컨트롤(iFrame API), 실패 시 순정 임베드로 자동 폴백 */}
              {album.spotifyAlbumId && (
                <div className="mt-4 border-t border-line pt-4">
                  {showSpotify ? (
                    <SpotifyFullPlayer
                      spotifyAlbumId={album.spotifyAlbumId}
                      albumTitle={album.title}
                      artist={album.artist}
                      coverImageUrl={album.coverImageUrl}
                    />
                  ) : (
                    <button
                      onClick={() => setShowSpotify(true)}
                      className="text-sm text-mut underline-offset-4 hover:text-acc hover:underline"
                    >
                      Spotify로 전곡 듣기 →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
