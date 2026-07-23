"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/common/Logo";
import { ratingColor } from "@/lib/rating";

const HUES = ["#c026d3", "#dc2626", "#1d4ed8", "#0891b2", "#7c3aed", "#ea580c"];

type Profile = { displayName: string; photoUrl: string | null };
type Bg = "gradient" | "transparent";

export type ShareSubject = {
  typeLabel: "Album" | "Song";
  title: string;
  artist: string;
  coverImageUrl: string | null;
  manualRating: number | null;
  comment?: string | null;
  /** 앨범 공유일 때만: 최애곡 정보 (표시 여부는 토글로 선택 가능) */
  favorite?: { title: string; manualRating: number | null } | null;
  filenameBase: string;
  colorSeed: number;
};

function RatingRing({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 10));
  const color = ratingColor(value);
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
        {value.toFixed(1)}
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
      <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
    </svg>
  );
}

export function ShareCard({ subject, triggerSize = "lg" }: { subject: ShareSubject; triggerSize?: "sm" | "lg" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bg, setBg] = useState<Bg>("gradient");
  const [showFavorite, setShowFavorite] = useState(true);
  const [profile, setProfile] = useState<Profile>({ displayName: "Haengwoon", photoUrl: null });
  const cardRef = useRef<HTMLDivElement>(null);
  const hue = HUES[subject.colorSeed % HUES.length];

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile));
  }, []);

  // 이 컴포넌트의 <img>들은 html-to-image로 그대로 캡처돼야 해서 의도적으로 next/image를 안 씀
  // (next/image의 lazy loading/자동 srcset이 캡처 타이밍·crossOrigin 처리에 영향을 줄 수 있음).
  async function renderPng(): Promise<string> {
    const { toPng } = await import("html-to-image");
    if (!cardRef.current) throw new Error("card not ready");
    // backgroundColor를 지정하지 않으면 투명 모드에서 알파 채널이 그대로 유지된 PNG로 나옴
    return toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const dataUrl = await renderPng();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${subject.filenameBase}-haengwoon.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    setBusy(true);
    try {
      const dataUrl = await renderPng();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${subject.filenameBase}-haengwoon.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title?: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: `${subject.title} — Haengwoon` });
      } else {
        await handleDownload();
      }
    } finally {
      setBusy(false);
    }
  }

  const favoriteVisible = subject.favorite && showFavorite;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={subject.typeLabel === "Album" ? "앨범 스토리에 공유" : "곡 스토리에 공유"}
        className={
          "inline-flex items-center justify-center rounded-full border border-line hover:border-acc " +
          (triggerSize === "lg" ? "h-9 w-9" : "h-7 w-7")
        }
      >
        <ShareIcon />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] flex-col items-center gap-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 배경 토글 + 최애곡 표시 토글 */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex rounded-full border border-white/30 p-1 text-xs text-white">
                <button
                  onClick={() => setBg("gradient")}
                  className={"rounded-full px-3 py-1.5 " + (bg === "gradient" ? "bg-white text-black font-medium" : "")}
                >
                  그라데이션
                </button>
                <button
                  onClick={() => setBg("transparent")}
                  className={"rounded-full px-3 py-1.5 " + (bg === "transparent" ? "bg-white text-black font-medium" : "")}
                >
                  투명
                </button>
              </div>
              {subject.favorite && (
                <button
                  onClick={() => setShowFavorite((v) => !v)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs " +
                    (showFavorite ? "border-white bg-white text-black font-medium" : "border-white/30 text-white")
                  }
                >
                  최애곡 표시
                </button>
              )}
            </div>

            {/* 캡처 대상: 배경(그라데이션/투명) + 그 위에 뜨는 흰 박스 카드 */}
            <div
              ref={cardRef}
              className="relative flex w-[360px] items-center justify-center overflow-hidden p-8"
              style={{ minHeight: 520 }}
            >
              {bg === "gradient" && (
                <>
                  <div className="absolute inset-0 -z-20">
                    {subject.coverImageUrl ? (
                      <div
                        className="h-full w-full scale-150 bg-cover bg-center blur-3xl"
                        style={{ backgroundImage: `url(${subject.coverImageUrl})` }}
                      />
                    ) : (
                      <div className="h-full w-full" style={{ background: hue }} />
                    )}
                  </div>
                  <div className="absolute inset-0 -z-10 bg-black/10" />
                </>
              )}

              {/* 흰 박스 카드 — 모서리가 자연스럽게 이어지도록 안쪽 요소 반경 = 바깥 반경 - 패딩 */}
              <div className="w-full rounded-[28px] bg-white p-4 pb-5 text-black shadow-2xl">
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    {profile.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.photoUrl}
                        alt={profile.displayName}
                        crossOrigin="anonymous"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-sm font-bold">
                        {profile.displayName.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-sm font-semibold">{profile.displayName}</span>
                  </div>
                  <Logo size={18} className="text-black/40" />
                </div>

                <div className="aspect-square w-full overflow-hidden rounded-[12px]">
                  {subject.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={subject.coverImageUrl}
                      alt={subject.title}
                      crossOrigin="anonymous"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-4xl font-bold text-white"
                      style={{ background: hue }}
                    >
                      {subject.title.slice(0, 1)}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-3 px-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{subject.title}</p>
                    <p className="truncate text-sm text-black/55">
                      {subject.artist} · {subject.typeLabel}
                    </p>
                  </div>
                  {subject.manualRating != null && <RatingRing value={subject.manualRating} />}
                </div>

                {subject.comment && (
                  <p className="mt-2 px-1 italic text-black/70">&ldquo;{subject.comment}&rdquo;</p>
                )}

                {favoriteVisible && subject.favorite && (
                  <div className="mt-3 px-1">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-black/40">
                      Favorite Song:
                    </p>
                    <div className="flex items-center gap-3 rounded-[16px] bg-black/5 p-3">
                      {subject.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={subject.coverImageUrl}
                          alt={subject.favorite.title}
                          crossOrigin="anonymous"
                          className="h-11 w-11 shrink-0 rounded-[10px] object-cover"
                        />
                      ) : (
                        <div className="h-11 w-11 shrink-0 rounded-[10px]" style={{ background: hue }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{subject.favorite.title}</p>
                        <p className="truncate text-xs text-black/55">{subject.artist}</p>
                      </div>
                      {subject.favorite.manualRating != null && (
                        <span className="shrink-0 rounded-full bg-black/10 px-2.5 py-1 text-xs font-bold text-[#16a34a]">
                          {subject.favorite.manualRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                disabled={busy}
                className="rounded-full bg-acc px-5 py-2.5 text-sm font-semibold text-on-acc disabled:opacity-50"
              >
                {busy ? "생성 중…" : "이미지 다운로드"}
              </button>
              <button
                onClick={handleShare}
                disabled={busy}
                className="rounded-full border border-white/30 px-5 py-2.5 text-sm text-white hover:border-white disabled:opacity-50"
              >
                공유하기
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/30 px-5 py-2.5 text-sm text-white hover:border-white"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
