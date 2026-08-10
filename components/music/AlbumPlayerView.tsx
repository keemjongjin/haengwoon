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
};

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
}: {
  coverImageUrl: string | null;
  title: string;
  artist: string;
  spinning: boolean;
}) {
  const cover = useCoverColor(coverImageUrl);
  return (
    // 넓은 화면에서는 왼쪽 영역을 통째로 쓰므로 판을 크게 키운다.
    // 내부 배치가 전부 %라서 크기가 변해도 톤암 각도(아래)를 다시 잡을 필요는 없다.
    // 판(최대 1.06W)과 park한 톤암(최대 ~1.09W)은 이 상자보다 오른쪽으로 조금 삐져나온다.
    // 좁은 화면에서 폭을 더 줄여두는 건 그 여유분까지 화면 안에 들어오게 하려는 것.
    <div className="relative aspect-[1.45/1] w-full max-w-[300px] sm:max-w-[340px] lg:max-w-[580px] xl:max-w-[660px]">
      {/* LP — 재생 중이면 자켓 밖으로 더 빠져나오면서 회전 */}
      <div
        className="absolute left-[26%] top-1/2 aspect-square w-[68%] -translate-y-1/2 transition-[left] duration-700 ease-out"
        style={{ left: spinning ? "38%" : "26%" }}
      >
        {/* ring/그림자: 다크 모드에서 검은 판이 어두운 배경에 그대로 묻히는 걸 막는다.
            ★ Safari 대응: 판의 존재감을 그라디언트에 의존시키지 않는다. 예전엔 background 단축
            속성에 repeating-radial-gradient만 넣었는데, Safari가 이 촘촘한(2px) 반복 그라디언트를
            못 그리면 배경이 통째로 사라져 판이 아예 안 보였다(크롬은 정상). 그래서
            backgroundColor(단색)를 바닥에 깔고 그루브는 backgroundImage로 얹어, 그루브가 실패해도
            검은 원반은 반드시 보이게 한다. 그루브 간격도 3/6px로 넓혀 Safari 부담을 줄였다.
            translateZ(0)는 회전 애니메이션 중 배경이 깜빡이는 Safari 합성 이슈 예방용. */}
        <div
          className="h-full w-full rounded-full shadow-xl ring-1 ring-black/20 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.14),0_10px_40px_rgba(0,0,0,0.7)] dark:ring-white/15"
          style={{
            backgroundColor: "#191920",
            backgroundImage:
              "repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.055) 0 3px, rgba(0,0,0,0) 3px 6px)",
            animation: "haengwoon-spin 5s linear infinite",
            animationPlayState: spinning ? "running" : "paused",
            transform: "translateZ(0)",
            willChange: "transform",
          }}
        >
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

      {/* 자켓(커버) — LP보다 앞에 서서 판이 안에서 빠져나온 것처럼 보이게 한다 */}
      <div className="absolute left-0 top-1/2 aspect-square w-[62%] -translate-y-1/2 overflow-hidden rounded-[3px] shadow-2xl">
        {coverImageUrl ? (
          <Image src={coverImageUrl} alt={title} fill sizes="200px" className="object-cover" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-card text-3xl font-bold text-mut">
            {title.slice(0, 1)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/30 to-transparent" />
      </div>

      {/* 톤암 — 피벗에서 아래로 늘어뜨린 구조 전체를 회전시킨다(origin: top center).
          정지 시 거의 수직으로 판 바깥(암 레스트)에, 재생 시 안쪽으로 swing해 판 위에 얹힌다.
          기하를 "한 덩어리 + 회전"으로 유지해야 각도를 바꿔도 부품 위치가 안 틀어진다.
          금속 질감은 좌우로 흐르는 밝기 그라디언트(위→아래가 아니라 가로 방향)로 낸다 —
          원통에 빛이 스치는 하이라이트가 입체감의 핵심. */}
      <div
        className="absolute z-10 transition-transform duration-700 ease-out"
        style={{
          right: "7%",
          top: "10%",
          width: 10,
          height: "46%",
          transformOrigin: "top center",
          // ── 각도는 눈대중이 아니라 이 컴포넌트의 기하로 역산한 값이다 ─────────────────
          // 컨테이너 폭을 W라 하면 (aspect 1.45 → 높이 H = 0.690W)
          //   피벗    ≈ (0.93W, 0.069W)          [right:7%, top:10%, origin: top center]
          //   암 길이 L = 0.46H + 13px = 0.317W + 13px   (13px = 스타일러스 팁의 -bottom 오프셋)
          //   LP 반지름 r = 0.34W, 중심 y = 0.345W
          //   LP 중심 x = 0.72W (재생, left 38%) / 0.60W (정지, left 26%)
          // 회전 θ에 대해 팁 = (pivot.x − L·sinθ, pivot.y + L·cosθ) 이므로
          // **음수 θ = 시계방향 = 팁이 오른쪽(판 바깥)으로**, θ가 커질수록 판 안쪽으로 들어온다.
          //   재생 −12° → 팁이 중심에서 약 0.82~0.85r  (첫 곡이 시작되는 바깥쪽 홈) ✔
          //   정지 −26° → 약 1.4r, 판 오른쪽 바깥 암 레스트에 park ✔
          // (예전에 rect 기반으로 피벗을 재다가 값이 틀렸다 — 회전된 요소의 getBoundingClientRect는
          //  회전 후의 축정렬 박스라 피벗 좌표가 아니다. 그래서 부호를 반대로 잡았었다.)
          transform: `rotate(${spinning ? -12 : -26}deg)`,
          filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))",
        }}
        aria-hidden="true"
      >
        {/* 암 본체(원통) — 가로 그라디언트로 금속 하이라이트 */}
        <div
          className="absolute left-1/2 top-1 h-[calc(100%-0.5rem)] w-[5px] -translate-x-1/2 rounded-full"
          style={{
            backgroundImage:
              "linear-gradient(to right, #6f7378 0%, #c9ced4 38%, #ffffff 50%, #aeb4bb 66%, #5e6268 100%)",
          }}
        />

        {/* 피벗 베이스(원형 마운트) */}
        <div
          className="absolute -top-1 left-1/2 h-[22px] w-[22px] -translate-x-1/2 rounded-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 34% 28%, #f2f4f6 0%, #b9bfc6 42%, #767b81 74%, #4a4e53 100%)",
            boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.35)",
          }}
        />
        {/* 피벗 중심 나사 */}
        <div className="absolute top-[6px] left-1/2 h-[9px] w-[9px] -translate-x-1/2 rounded-full bg-neutral-600 ring-1 ring-white/25" />

        {/* 카운터웨이트 — 피벗 뒤쪽으로 살짝 나온 추(진짜 톤암의 실루엣) */}
        <div
          className="absolute -top-[18px] left-1/2 h-[13px] w-[15px] -translate-x-1/2 rounded-[3px]"
          style={{
            backgroundImage: "linear-gradient(to right, #4d5156 0%, #9aa0a6 45%, #e6e9ec 55%, #6b7076 100%)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
        />

        {/* 헤드셸 — 끝에서 살짝 꺾인 사다리꼴 + 바늘(스타일러스) */}
        <div
          className="absolute -bottom-[10px] left-1/2 h-[18px] w-[13px] -translate-x-1/2 rotate-[18deg]"
          style={{
            backgroundImage: "linear-gradient(to right, #5a5e63 0%, #b7bdc3 40%, #f0f2f4 52%, #7d8288 100%)",
            clipPath: "polygon(18% 0%, 82% 0%, 100% 62%, 50% 100%, 0% 62%)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
          }}
        />
        {/* 스타일러스 팁 — 판에 닿는 점 */}
        <div className="absolute -bottom-[13px] left-1/2 h-[4px] w-[2px] -translate-x-1/2 rounded-b-full bg-neutral-800 dark:bg-neutral-900" />
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
