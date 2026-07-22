"use client";

import Image from "next/image";
import { useState } from "react";
import { GenrePicker } from "./GenrePicker";
import { useAdminToast, describeFailure } from "./AdminToastContext";

type SearchResult = {
  spotifyAlbumId: string;
  title: string;
  artist: string;
  coverImageUrl: string;
  releaseDate: string;
};

type Track = { id: number; title: string; trackNumber: number };

// 앨범 등록 흐름: ① 평점(그라데이션 슬라이더)+코멘트 → ② 최애곡 선택. Podiums "Add rating" 참고.
export function RegisterAlbumModal({
  result,
  existingGenres,
  onClose,
  onDone,
}: {
  result: SearchResult;
  existingGenres: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { showError } = useAdminToast();
  const [step, setStep] = useState<"rate" | "favorite">("rate");
  const [rating, setRating] = useState(7);
  const [comment, setComment] = useState("");
  const [genre, setGenre] = useState("");
  const [busy, setBusy] = useState(false);
  const [albumId, setAlbumId] = useState<number | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);

  async function handleNext() {
    setBusy(true);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyAlbumId: result.spotifyAlbumId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        showError(data?.error ? `등록 실패: ${data.error}` : await describeFailure(res));
        return;
      }

      const results = await Promise.all([
        fetch(`/api/albums/${data.album.id}/rating`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        }),
        comment.trim()
          ? fetch(`/api/albums/${data.album.id}/review`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ review: comment.trim() }),
            })
          : Promise.resolve(null),
        // Spotify API가 더 이상 장르 데이터를 제공하지 않아 직접 입력받음
        genre.trim()
          ? fetch(`/api/albums/${data.album.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ genre: genre.trim() }),
            })
          : Promise.resolve(null),
      ]);
      const failed = results.some((r) => r && !r.ok);
      if (failed) showError("평점/코멘트/장르 중 일부가 저장되지 않았어요. 등록 후 관리자 목록에서 다시 확인해주세요.");

      setAlbumId(data.album.id);
      setTracks(data.tracks ?? []);
      setStep("favorite");
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    setBusy(true);
    try {
      if (favoriteId != null) {
        const res = await fetch("/api/tracks/favorite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId: favoriteId }),
        });
        if (!res.ok) {
          showError("최애곡 지정에 실패했어요. 등록은 완료됐으니 나중에 다시 지정해주세요.");
        }
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  // 슬라이더 값(0~10)에 따라 빨강→노랑→초록 그라데이션 위 손잡이 위치 표현
  const sliderBg = "linear-gradient(90deg, #ef4444, #eab308, #22c55e)";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-bg p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{step === "rate" ? "Add rating" : "Favorite song"}</h2>
          <button onClick={onClose} aria-label="닫기" className="text-mut hover:text-fg">
            ✕
          </button>
        </div>
        <div className="mb-5 border-b border-line pb-4" />

        {step === "rate" && (
          <div>
            <div className="flex items-center gap-3">
              <Image
                src={result.coverImageUrl}
                alt={result.title}
                width={56}
                height={56}
                className="h-14 w-14 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold">{result.title}</p>
                <p className="truncate text-sm text-mut">{result.artist}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="rating-slider flex-1"
                style={{ background: sliderBg }}
              />
              <span className="w-12 text-right text-lg font-bold text-acc">{rating.toFixed(1)}</span>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment"
              rows={3}
              className="mt-5 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-acc"
            />

            <div className="mt-3">
              <GenrePicker
                genres={existingGenres}
                value={genre}
                onChange={setGenre}
                className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-acc"
              />
            </div>

            <button
              onClick={handleNext}
              disabled={busy}
              className="mt-6 w-full rounded-full bg-fg py-3 text-sm font-semibold text-bg disabled:opacity-50"
            >
              {busy ? "등록 중…" : "Next"}
            </button>
          </div>
        )}

        {step === "favorite" && (
          <div>
            <p className="mb-3 text-sm text-mut">최애곡을 하나 골라주세요 (건너뛰어도 됩니다)</p>
            <ul className="space-y-1">
              {tracks.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setFavoriteId(t.id)}
                    className={
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm " +
                      (favoriteId === t.id ? "border-acc bg-card" : "border-line hover:border-mut")
                    }
                  >
                    <span className="w-5 text-mut">{t.trackNumber}</span>
                    <span className="flex-1 truncate">{t.title}</span>
                    {favoriteId === t.id && <span>🔥</span>}
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={handleFinish}
              disabled={busy || albumId == null}
              className="mt-6 w-full rounded-full bg-fg py-3 text-sm font-semibold text-bg disabled:opacity-50"
            >
              {busy ? "저장 중…" : "완료"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
