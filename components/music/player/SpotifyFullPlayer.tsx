"use client";

// Spotify 전곡 재생기. 공식 Embed를 그대로 펼치는 대신, Spotify가 제공하는 iFrame API로
// 임베드를 "조종"해서 우리 디자인의 컨트롤(재생/일시정지 + 진행바)을 붙인다.
//
// 지켜야 하는 제약:
//  - iframe 자체는 DOM에 남아 있어야 한다. display:none으로 없애면 재생이 깨지므로, 화면 아래쪽에
//    작게 남겨 출처 표기 겸 폴백으로 쓴다.
//  - 전곡 재생은 "그 브라우저에 Spotify 로그인"이 되어 있을 때만 된다(아니면 30초 미리듣기).
//    이건 Spotify 쪽 정책이라 코드로 우회할 수 없다.
//  - iFrame API가 간헐적으로 준비되지 않는다는 보고가 있어, 일정 시간 내 준비되지 않으면
//    자체 컨트롤을 포기하고 순정 임베드만 남긴다(FALLBACK). 이 경우에도 재생 자체는 정상 동작한다.

import { useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "./AudioPlayerContext";

/** Spotify iFrame API가 넘겨주는 컨트롤러(필요한 메서드만 추림). */
type EmbedController = {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  destroy: () => void;
  addListener: (
    event: "playback_update" | "ready",
    cb: (e: {
      data: {
        position: number;
        duration: number;
        isPaused: boolean;
        /** `spotify:track:...` — 앨범 재생 중 곡이 넘어가면 이 값이 바뀐다. 문서화되어 있진 않아 옵셔널. */
        playingURI?: string;
      };
    }) => void
  ) => void;
};

type IFrameAPI = {
  createController: (
    el: HTMLElement,
    options: { uri: string; width: string | number; height: string | number },
    cb: (controller: EmbedController) => void
  ) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
    __spotifyIFrameApi?: IFrameAPI;
  }
}

const API_SRC = "https://open.spotify.com/embed/iframe-api/v1";
/** 이 시간 안에 API가 준비되지 않으면 자체 컨트롤을 포기하고 순정 임베드로 간다. */
const READY_TIMEOUT_MS = 6000;
/**
 * 이 길이 이하로 재생되면 전곡이 아니라 미리듣기 클립이라고 본다.
 * Spotify는 보통 30초를 주지만 20초짜리도 관측돼서 넉넉히 45초로 잡았다.
 * (정규 곡이 45초 이하인 경우는 거의 없고, 그런 곡이면 어차피 오판해도 손해가 없다.)
 */
export const PREVIEW_MAX_SEC = 45;

/**
 * API 스크립트를 한 번만 로드하고, 준비된 IFrameAPI 객체를 돌려준다.
 * onSpotifyIframeApiReady는 전역 콜백이라 이 모듈에서 한 번만 잡아 window에 캐싱해둔다
 * (컴포넌트가 다시 마운트돼도 스크립트를 중복 로드하지 않도록).
 */
function loadIFrameApi(): Promise<IFrameAPI> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.__spotifyIFrameApi) return Promise.resolve(window.__spotifyIFrameApi);

  return new Promise((resolve, reject) => {
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      window.__spotifyIFrameApi = api;
      prev?.(api);
      resolve(api);
    };
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = API_SRC;
      s.async = true;
      s.onerror = () => reject(new Error("iframe api load failed"));
      document.body.appendChild(s);
    }
    setTimeout(() => reject(new Error("iframe api timeout")), READY_TIMEOUT_MS);
  });
}

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

export function SpotifyFullPlayer({
  spotifyAlbumId,
  albumTitle,
  artist,
  coverImageUrl,
}: {
  spotifyAlbumId: string;
  albumTitle: string;
  artist: string;
  coverImageUrl: string | null;
}) {
  const { setFullPlayback, pause: pausePreview } = useAudioPlayer();
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EmbedController | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadIFrameApi()
      .then((api) => {
        if (cancelled || !hostRef.current) return;
        api.createController(
          hostRef.current,
          { uri: `spotify:album:${spotifyAlbumId}`, width: "100%", height: 80 },
          (controller) => {
            if (cancelled) return;
            controllerRef.current = controller;
            controller.addListener("playback_update", (e) => {
              // position/duration은 ms 단위로 들어온다
              const pos = e.data.position / 1000;
              const dur = e.data.duration / 1000;
              setPosition(pos);
              setDuration(dur);
              setIsPaused(e.data.isPaused);
              // Spotify가 재생을 시작하면 Deezer 미리듣기는 멈춘다 — 두 음원이 겹쳐 나오면 안 됨
              if (!e.data.isPaused) pausePreview();
              // 하단 재생바가 위치 표시·seek를 할 수 있도록 최신 상태를 올려보낸다
              setFullPlayback({
                title: albumTitle,
                artist,
                coverImageUrl,
                position: pos,
                duration: dur,
                isPaused: e.data.isPaused,
                // "spotify:track:xxx" → "xxx". 우리 tracks.spotify_track_id와 바로 맞춰볼 수 있다.
                // 전곡 재생에서는 이 값이 오지 않는 경우가 있어, 받는 쪽에 길이 기반 폴백을 뒀다.
                trackId: e.data.playingURI?.split(":").pop() ?? null,
                togglePlay: () => controllerRef.current?.togglePlay(),
                seek: (s: number) => controllerRef.current?.seek(s),
              });
            });
            setReady(true);
          }
        );
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      controllerRef.current?.destroy?.();
      controllerRef.current = null;
      // 플레이어를 닫으면 하단 재생바의 seek 바도 함께 사라져야 한다
      setFullPlayback(null);
    };
  }, [spotifyAlbumId, albumTitle, artist, coverImageUrl, setFullPlayback, pausePreview]);

  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  // duration이 잡히기 전(0)에는 판단을 보류한다 — 로딩 중에 "미리듣기"라고 단정하면 안 된다.
  const isPreviewClip = duration > 0 && duration <= PREVIEW_MAX_SEC;

  // API가 끝내 준비되지 않으면 순정 임베드로 폴백 — 자체 컨트롤만 포기하고 재생은 그대로 된다.
  if (failed) {
    return (
      <div>
        <iframe
          src={`https://open.spotify.com/embed/album/${spotifyAlbumId}?utm_source=generator`}
          width="100%"
          height="152"
          style={{ border: 0 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify"
          className="rounded-xl"
        />
        <p className="mt-2 text-[11px] text-mut">
          Spotify에 로그인되어 있으면 전곡, 아니면 30초 미리듣기로 재생됩니다.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* 자체 컨트롤 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => controllerRef.current?.togglePlay()}
          disabled={!ready}
          aria-label={isPaused ? "재생" : "일시정지"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-acc text-on-acc transition-opacity disabled:opacity-40"
        >
          {isPaused ? <PlayIcon /> : <PauseIcon />}
        </button>

        <div className="min-w-0 flex-1">
          <div
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full overflow-hidden rounded-full bg-line"
          >
            <div
              className="h-full rounded-full bg-acc transition-[width] duration-300 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-mut">
            <span>{fmt(position)}</span>
            <span>{ready ? fmt(duration) : "연결 중…"}</span>
          </div>
        </div>
      </div>

      {/* 실제 임베드 — 숨기면 재생이 깨지므로 남겨두되 작게. 출처 표기 역할도 겸한다.
          ★ iFrame API는 넘겨받은 요소를 iframe으로 "교체"한다. 그래서 hostRef가 달린 div에
            준 클래스는 컨트롤러 생성과 동시에 전부 사라진다 — 여백을 여기 줘봐야 먹지 않는다.
            간격·모서리·투명도는 교체되지 않는 바깥 래퍼가 들고 있어야 한다.
          자체 컨트롤과 붙어 있으면 재생 버튼이 임베드에 얹힌 것처럼 보여 여백을 넉넉히 둔다. */}
      <div className="mt-6 overflow-hidden rounded-lg opacity-70">
        <div ref={hostRef} />
      </div>

      {/* 전곡이 안 나올 때 "왜 안 되는지"를 알려준다. 예전엔 조건 없이 한 줄만 띄워서,
          로그인을 해둔 방문자는 왜 여전히 짧게 끊기는지 알 길이 없었다.
          전곡 재생 여부는 Spotify가 정하는 것이라 우리 코드로는 바꿀 수 없고,
          대신 조건과 탈출구(앱에서 열기)를 분명히 보여주는 게 최선이다. */}
      {isPreviewClip ? (
        <div className="mt-2 space-y-1">
          <p className="text-[11px] text-mut">
            지금은 미리듣기로 재생 중입니다. 전곡 재생은 이 브라우저에{" "}
            <strong className="font-semibold">Spotify Premium</strong> 계정으로 로그인되어 있고,
            브라우저가 서드파티 쿠키를 허용할 때만 가능합니다.
          </p>
          <a
            href={`https://open.spotify.com/album/${spotifyAlbumId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-[11px] text-acc underline-offset-4 hover:underline"
          >
            Spotify에서 열기 →
          </a>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-mut">Spotify로 전곡 재생 중입니다.</p>
      )}
    </div>
  );
}
