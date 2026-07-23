"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cover } from "@/components/music/Cover";
import { SpotifyEmbed } from "@/components/music/SpotifyEmbed";
import { GenrePicker } from "./GenrePicker";
import { RegisterAlbumModal } from "./RegisterAlbumModal";
import { useAdminToast, describeFailure } from "./AdminToastContext";

type Album = {
  id: number;
  title: string;
  artist: string;
  genre: string | null;
  coverImageUrl: string | null;
  spotifyAlbumId: string | null;
  manualRating: number | null;
  eloRating: number;
  eloScore10: number;
  reviewDate: string | null;
  review: string | null;
  createdAt: string;
};

type DeezerResult = {
  trackId: string;
  title: string;
  artist: string;
  album: string;
};

type Track = {
  id: number;
  title: string;
  trackNumber: number;
  manualRating: number | null;
  isFavorite: boolean;
  previewUrl: string | null;
  comment: string | null;
};

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    >
      <path d="M12 3.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
    </svg>
  );
}

type SearchResult = {
  spotifyAlbumId: string;
  title: string;
  artist: string;
  coverImageUrl: string;
  releaseDate: string;
};

export function MusicAdmin() {
  const { showError, showSuccess } = useAdminToast();

  const [pair, setPair] = useState<{ a: Album; b: Album } | null>(null);
  const [standings, setStandings] = useState<Album[]>([]);
  const [ratingDrafts, setRatingDrafts] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [registering, setRegistering] = useState<SearchResult | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ title: "", artist: "", genre: "", review: "" });

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [tracksByAlbum, setTracksByAlbum] = useState<Record<number, Track[]>>({});
  const [trackRatingDrafts, setTrackRatingDrafts] = useState<Record<number, string>>({});
  const [trackCommentDrafts, setTrackCommentDrafts] = useState<Record<number, string>>({});
  const [trackPreviewDrafts, setTrackPreviewDrafts] = useState<Record<number, string>>({});
  const [backfillingId, setBackfillingId] = useState<number | null>(null);
  const [backfillMsg, setBackfillMsg] = useState<Record<number, string>>({});

  const [deezerPanelOpen, setDeezerPanelOpen] = useState<Record<number, boolean>>({});
  const [deezerQueryDrafts, setDeezerQueryDrafts] = useState<Record<number, string>>({});
  const [deezerResults, setDeezerResults] = useState<Record<number, DeezerResult[]>>({});
  const [deezerSearchingId, setDeezerSearchingId] = useState<number | null>(null);

  const [manageQuery, setManageQuery] = useState("");
  const [managePage, setManagePage] = useState(1);
  const MANAGE_PAGE_SIZE = 10;

  const loadStandings = useCallback(async () => {
    const res = await fetch("/api/albums");
    const data = await res.json();
    // 관리 편의를 위해 최신 등록순(createdAt 내림차순)으로 정렬 — 방금 추가한 앨범이 맨 위에.
    const sorted = [...data.albums].sort((x: Album, y: Album) =>
      x.createdAt < y.createdAt ? 1 : x.createdAt > y.createdAt ? -1 : 0
    );
    setStandings(sorted);
    setRatingDrafts(
      Object.fromEntries(sorted.map((a) => [a.id, a.manualRating != null ? String(a.manualRating) : ""]))
    );
  }, []);

  const loadMatch = useCallback(async () => {
    const res = await fetch("/api/match");
    const data = await res.json();
    if (data.ok) setPair({ a: data.a, b: data.b });
  }, []);

  useEffect(() => {
    loadStandings();
    loadMatch();
  }, [loadStandings, loadMatch]);

  async function vote(winnerId: number, loserId: number) {
    const res = await fetch("/api/match/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winnerId, loserId }),
    });
    if (res.ok) {
      await loadStandings();
      await loadMatch();
    } else {
      showError(await describeFailure(res));
    }
  }

  async function saveRating(id: number) {
    const trimmed = (ratingDrafts[id] ?? "").trim();
    if (trimmed !== "" && Number.isNaN(Number(trimmed))) return;
    const rating = trimmed === "" ? null : Number(trimmed);
    const res = await fetch(`/api/albums/${id}/rating`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    if (res.ok) {
      await loadStandings();
      showSuccess("평점을 저장했어요.");
    } else {
      showError(await describeFailure(res));
    }
  }

  function startEdit(al: Album) {
    setEditingId(al.id);
    setEditDraft({ title: al.title, artist: al.artist, genre: al.genre ?? "", review: al.review ?? "" });
  }

  async function saveEdit(id: number) {
    const [metaRes, reviewRes] = await Promise.all([
      fetch(`/api/albums/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editDraft.title, artist: editDraft.artist, genre: editDraft.genre }),
      }),
      fetch(`/api/albums/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review: editDraft.review }),
      }),
    ]);
    if (metaRes.ok && reviewRes.ok) {
      setEditingId(null);
      await loadStandings();
      showSuccess("앨범 정보를 수정했어요.");
    } else {
      showError(await describeFailure(metaRes.ok ? reviewRes : metaRes));
    }
  }

  async function removeAlbum(id: number, title: string) {
    if (!confirm(`"${title}" 앨범을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    const res = await fetch(`/api/albums/${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadStandings();
      showSuccess("앨범을 삭제했어요.");
    } else {
      showError(await describeFailure(res));
    }
  }

  async function toggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!tracksByAlbum[id]) {
      const res = await fetch(`/api/albums/${id}`);
      const data = await res.json();
      if (data.ok) {
        setTracksByAlbum((m) => ({ ...m, [id]: data.tracks }));
        setTrackRatingDrafts((d) => ({
          ...d,
          ...Object.fromEntries(
            data.tracks.map((t: Track) => [t.id, t.manualRating != null ? String(t.manualRating) : ""])
          ),
        }));
        setTrackCommentDrafts((d) => ({
          ...d,
          ...Object.fromEntries(data.tracks.map((t: Track) => [t.id, t.comment ?? ""])),
        }));
        setTrackPreviewDrafts((d) => ({
          ...d,
          ...Object.fromEntries(data.tracks.map((t: Track) => [t.id, t.previewUrl ?? ""])),
        }));
      } else {
        showError(await describeFailure(res));
      }
    }
  }

  // 트랙별로 따로 눌러야 했던 저장 버튼들을 앨범 단위 버튼 하나로 통합 —
  // 현재 펼쳐진 앨범의 모든 트랙에 대해 평점/코멘트/미리듣기 URL을 한 번에 저장.
  async function saveAllTracks(albumId: number) {
    const tracks = tracksByAlbum[albumId] ?? [];
    if (tracks.length === 0) return;

    const requests = tracks.flatMap((t) => {
      const ratingTrimmed = (trackRatingDrafts[t.id] ?? "").trim();
      const ratingValid = ratingTrimmed === "" || !Number.isNaN(Number(ratingTrimmed));
      const ratingReq = ratingValid
        ? fetch(`/api/tracks/${t.id}/rating`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating: ratingTrimmed === "" ? null : Number(ratingTrimmed) }),
          })
        : null;
      const commentReq = fetch(`/api/tracks/${t.id}/comment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: trackCommentDrafts[t.id] ?? "" }),
      });
      const previewReq = fetch(`/api/tracks/${t.id}/preview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previewUrl: trackPreviewDrafts[t.id] ?? "" }),
      });
      return [ratingReq, commentReq, previewReq].filter((r): r is Promise<Response> => r !== null);
    });

    const results = await Promise.all(requests);
    const failed = results.some((r) => !r.ok);

    const res = await fetch(`/api/albums/${albumId}`);
    const data = await res.json();
    if (data.ok) {
      setTracksByAlbum((m) => ({ ...m, [albumId]: data.tracks }));
      setTrackRatingDrafts((d) => ({
        ...d,
        ...Object.fromEntries(
          data.tracks.map((t: Track) => [t.id, t.manualRating != null ? String(t.manualRating) : ""])
        ),
      }));
      setTrackCommentDrafts((d) => ({
        ...d,
        ...Object.fromEntries(data.tracks.map((t: Track) => [t.id, t.comment ?? ""])),
      }));
      setTrackPreviewDrafts((d) => ({
        ...d,
        ...Object.fromEntries(data.tracks.map((t: Track) => [t.id, t.previewUrl ?? ""])),
      }));
    }

    if (failed) showError("일부 항목이 저장되지 않았어요. 다시 시도해주세요.");
    else showSuccess("수록곡 정보를 저장했어요.");
  }

  function toggleDeezerPanel(trackId: number, defaultQuery: string) {
    setDeezerPanelOpen((m) => ({ ...m, [trackId]: !m[trackId] }));
    setDeezerQueryDrafts((d) => (d[trackId] != null ? d : { ...d, [trackId]: defaultQuery }));
  }

  async function searchDeezerForTrack(trackId: number) {
    const term = deezerQueryDrafts[trackId]?.trim();
    if (!term) return;
    setDeezerSearchingId(trackId);
    try {
      const res = await fetch(`/api/deezer/search?term=${encodeURIComponent(term)}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setDeezerResults((m) => ({ ...m, [trackId]: data.results }));
      } else {
        showError(data?.error ? `검색 실패: ${data.error}` : `검색에 실패했어요 (${res.status})`);
      }
    } catch {
      showError("네트워크 오류로 검색에 실패했어요.");
    } finally {
      setDeezerSearchingId(null);
    }
  }

  // 목록에서 고르면 입력칸에 프록시 경로가 채워짐 — 실제 저장은 기존 "저장" 버튼(다른 필드와 동일 패턴).
  function pickDeezerResult(trackId: number, deezerTrackId: string) {
    setTrackPreviewDrafts((d) => ({ ...d, [trackId]: `/api/deezer-preview/${deezerTrackId}` }));
  }

  async function backfillPreviews(albumId: number) {
    setBackfillingId(albumId);
    try {
      const res = await fetch(`/api/albums/${albumId}/backfill-previews`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setTracksByAlbum((m) => ({ ...m, [albumId]: data.tracks }));
        setTrackPreviewDrafts((d) => ({
          ...d,
          ...Object.fromEntries(data.tracks.map((t: Track) => [t.id, t.previewUrl ?? ""])),
        }));
        setBackfillMsg((m) => ({ ...m, [albumId]: `${data.filled}곡 매칭 완료` }));
      } else {
        showError(await describeFailure(res));
      }
    } finally {
      setBackfillingId(null);
    }
  }

  async function toggleTrackFavorite(trackId: number, albumId: number) {
    const res = await fetch("/api/tracks/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    });
    if (res.ok) {
      const updated = await res.json();
      const nowFavorite = updated.track.isFavorite as boolean;
      // 앨범당 최애곡은 1곡 — 새로 지정되면 나머지는 화면에서도 즉시 해제
      setTracksByAlbum((m) => ({
        ...m,
        [albumId]: m[albumId].map((t) => ({
          ...t,
          isFavorite: t.id === trackId ? nowFavorite : nowFavorite ? false : t.isFavorite,
        })),
      }));
    } else {
      showError(await describeFailure(res));
    }
  }

  async function search() {
    setSearching(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.ok) {
        setResults(data.albums);
      } else {
        setResults([]);
        showError(data.error ? `검색 실패: ${data.error}` : "검색에 실패했어요.");
      }
    } catch {
      showError("네트워크 오류로 검색에 실패했어요.");
    } finally {
      setSearching(false);
    }
  }

  const filteredStandings = useMemo(() => {
    const q = manageQuery.trim().toLowerCase();
    if (!q) return standings;
    return standings.filter(
      (a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
    );
  }, [standings, manageQuery]);

  const manageTotalPages = Math.max(1, Math.ceil(filteredStandings.length / MANAGE_PAGE_SIZE));
  const safeManagePage = Math.min(managePage, manageTotalPages);
  const pagedStandings = filteredStandings.slice(
    (safeManagePage - 1) * MANAGE_PAGE_SIZE,
    safeManagePage * MANAGE_PAGE_SIZE
  );

  function handleManageQueryChange(v: string) {
    setManageQuery(v);
    setManagePage(1);
  }

  const existingGenres = useMemo(
    () => standings.map((a) => a.genre).filter((g): g is string => Boolean(g)),
    [standings]
  );

  return (
    <div>
      {/* 앨범 검색·등록 */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium text-mut">🔍 Spotify에서 앨범 검색·등록</h2>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="앨범명 또는 아티스트"
            className="flex-1 rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-acc"
          />
          <button
            onClick={search}
            disabled={searching}
            className="rounded-full bg-acc px-5 py-2.5 text-sm font-semibold text-on-acc disabled:opacity-50"
          >
            검색
          </button>
        </div>
        {results.length > 0 && (
          <ul className="mt-3 space-y-2">
            {results.map((r) => (
              <li
                key={r.spotifyAlbumId}
                className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 text-sm"
              >
                {r.coverImageUrl && (
                  <Image src={r.coverImageUrl} alt={r.title} width={40} height={40} className="rounded-md" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-mut">
                    {r.artist} · {r.releaseDate}
                  </div>
                </div>
                <button
                  onClick={() => setRegistering(r)}
                  className="rounded-full border border-line px-3 py-1 text-xs hover:border-acc"
                >
                  등록
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {registering && (
        <RegisterAlbumModal
          result={registering}
          existingGenres={existingGenres}
          onClose={() => setRegistering(null)}
          onDone={() => {
            setRegistering(null);
            setResults([]);
            setQuery("");
            loadStandings();
          }}
        />
      )}

      {/* 월드컵: 커버 이미지 + 미리듣기(Spotify 임베드)로 비교하며 투표 */}
      {pair && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-medium text-mut">🎧 Album Worldcup</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[pair.a, pair.b].map((al, i) => {
              const other = i === 0 ? pair.b : pair.a;
              return (
                <div key={al.id} className="rounded-2xl border border-line bg-card p-4">
                  <div className="flex items-center gap-3">
                    <Cover id={al.id} title={al.title} url={al.coverImageUrl} size={64} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{al.title}</p>
                      <p className="truncate text-sm text-mut">{al.artist}</p>
                    </div>
                  </div>
                  <SpotifyEmbed spotifyAlbumId={al.spotifyAlbumId} />
                  <button
                    onClick={() => vote(al.id, other.id)}
                    className="mt-3 w-full rounded-full bg-acc px-4 py-2.5 text-sm font-semibold text-on-acc"
                  >
                    선택
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 순위 + 평점 입력 */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-mut">🏆 앨범 관리 (평점 ⟂ Elo)</h2>
        <input
          value={manageQuery}
          onChange={(e) => handleManageQueryChange(e.target.value)}
          placeholder="제목 또는 아티스트 검색"
          className="mb-3 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-acc"
        />
        <ul>
          {pagedStandings.map((al) => (
            <li key={al.id} className="border-b border-line py-3">
              {editingId === al.id ? (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={editDraft.title}
                      onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                      placeholder="제목"
                      className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1 text-sm outline-none focus:border-acc"
                    />
                    <input
                      value={editDraft.artist}
                      onChange={(e) => setEditDraft((d) => ({ ...d, artist: e.target.value }))}
                      placeholder="아티스트"
                      className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1 text-sm outline-none focus:border-acc"
                    />
                    <GenrePicker
                      genres={existingGenres}
                      value={editDraft.genre}
                      onChange={(v) => setEditDraft((d) => ({ ...d, genre: v }))}
                    />
                  </div>
                  <textarea
                    value={editDraft.review}
                    onChange={(e) => setEditDraft((d) => ({ ...d, review: e.target.value }))}
                    placeholder="코멘트"
                    rows={2}
                    className="w-full rounded-lg border border-line bg-card px-2 py-1.5 text-sm outline-none focus:border-acc"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(al.id)}
                      className="rounded-full bg-acc px-3 py-1 text-xs font-semibold text-on-acc"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-full border border-line px-3 py-1 text-xs hover:border-acc"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="flex-1">
                    {al.title} <span className="text-mut">— {al.artist}</span>
                    {al.reviewDate && (
                      <span className="block text-[10px] text-mut/60">리뷰일 {al.reviewDate}</span>
                    )}
                  </span>
                  <span className="text-xs text-mut">Elo {al.eloRating} ({al.eloScore10})</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={ratingDrafts[al.id] ?? ""}
                    onChange={(e) => setRatingDrafts((d) => ({ ...d, [al.id]: e.target.value }))}
                    placeholder="평점"
                    className="w-16 rounded-lg border border-line bg-card px-2 py-1 text-sm outline-none focus:border-acc"
                  />
                  <button
                    onClick={() => saveRating(al.id)}
                    className="rounded-full border border-line px-3 py-1 text-xs hover:border-acc"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => toggleExpand(al.id)}
                    className="rounded-full border border-line px-3 py-1 text-xs hover:border-acc"
                  >
                    {expandedId === al.id ? "수록곡 닫기" : "수록곡 관리"}
                  </button>
                  <button
                    onClick={() => startEdit(al)}
                    className="rounded-full border border-line px-3 py-1 text-xs hover:border-acc"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => removeAlbum(al.id, al.title)}
                    className="rounded-full border border-line px-3 py-1 text-xs text-red-500 hover:border-red-500"
                  >
                    삭제
                  </button>
                </div>
              )}

              {expandedId === al.id && (
                <div className="mt-3 rounded-xl border border-line bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-mut">
                      {backfillMsg[al.id] ?? "Deezer에서 미리듣기 오디오 자동 매칭"}
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => backfillPreviews(al.id)}
                        disabled={backfillingId === al.id}
                        className="rounded-full border border-line px-3 py-1 text-xs hover:border-acc disabled:opacity-50"
                      >
                        {backfillingId === al.id ? "채우는 중…" : "미리듣기 채우기"}
                      </button>
                      {/* 트랙별로 따로 있던 저장 버튼들을 여기 하나로 통합 — 평점/코멘트/미리듣기 URL 전부 한 번에 저장 */}
                      <button
                        onClick={() => saveAllTracks(al.id)}
                        className="rounded-full bg-acc px-3 py-1 text-xs font-semibold text-on-acc hover:opacity-90"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {(tracksByAlbum[al.id] ?? []).map((t) => (
                      <li key={t.id} className="text-sm">
                        <div className="flex items-center gap-3">
                          <span
                            className={"w-3 shrink-0 text-center " + (t.previewUrl ? "text-acc" : "text-mut/30")}
                            title={t.previewUrl ? "미리듣기 있음" : "미리듣기 없음"}
                          >
                            ●
                          </span>
                          <span className="w-5 text-right text-mut">{t.trackNumber}</span>
                          <span className="flex-1 truncate">{t.title}</span>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            value={trackRatingDrafts[t.id] ?? ""}
                            onChange={(e) => setTrackRatingDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                            placeholder="평점"
                            className="w-16 rounded-lg border border-line bg-bg px-2 py-1 text-xs outline-none focus:border-acc"
                          />
                          <button
                            onClick={() => toggleTrackFavorite(t.id, al.id)}
                            aria-label="최애곡 토글"
                            className={t.isFavorite ? "text-acc" : "text-mut/40 hover:text-acc"}
                          >
                            <StarIcon filled={t.isFavorite} />
                          </button>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 pl-8">
                          <input
                            value={trackCommentDrafts[t.id] ?? ""}
                            onChange={(e) => setTrackCommentDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                            placeholder="곡 코멘트"
                            className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-xs outline-none focus:border-acc"
                          />
                        </div>
                        <div className="mt-1.5 pl-8">
                          <div className="flex items-center gap-2">
                            <input
                              value={trackPreviewDrafts[t.id] ?? ""}
                              onChange={(e) => setTrackPreviewDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                              placeholder="미리듣기 URL 직접 입력/수정 (자동 매칭이 틀렸을 때)"
                              className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-2 py-1 text-xs outline-none focus:border-acc"
                            />
                            <button
                              onClick={() => toggleDeezerPanel(t.id, `${t.title} ${al.artist}`)}
                              className="shrink-0 rounded-full border border-line px-2 py-1 text-xs hover:border-acc"
                            >
                              🔍 Deezer
                            </button>
                          </div>

                          {deezerPanelOpen[t.id] && (
                            <div className="mt-1.5 rounded-lg border border-line bg-bg p-2">
                              <div className="flex items-center gap-2">
                                <input
                                  value={deezerQueryDrafts[t.id] ?? ""}
                                  onChange={(e) =>
                                    setDeezerQueryDrafts((d) => ({ ...d, [t.id]: e.target.value }))
                                  }
                                  onKeyDown={(e) => e.key === "Enter" && searchDeezerForTrack(t.id)}
                                  placeholder="검색어 (곡명 아티스트)"
                                  className="min-w-0 flex-1 rounded-lg border border-line bg-card px-2 py-1 text-xs outline-none focus:border-acc"
                                />
                                <button
                                  onClick={() => searchDeezerForTrack(t.id)}
                                  disabled={deezerSearchingId === t.id}
                                  className="shrink-0 rounded-full border border-line px-2 py-1 text-xs hover:border-acc disabled:opacity-50"
                                >
                                  {deezerSearchingId === t.id ? "검색 중…" : "검색"}
                                </button>
                              </div>
                              {deezerResults[t.id] && deezerResults[t.id].length > 0 && (
                                <ul className="mt-1.5 space-y-1">
                                  {deezerResults[t.id].map((r, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs">
                                      <span className="min-w-0 flex-1 truncate text-mut">
                                        {r.title}{" "}
                                        <span className="text-mut/60">
                                          — {r.artist} · {r.album}
                                        </span>
                                      </span>
                                      <button
                                        onClick={() => pickDeezerResult(t.id, r.trackId)}
                                        className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] hover:border-acc"
                                      >
                                        선택
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {deezerResults[t.id]?.length === 0 && (
                                <p className="mt-1.5 text-[11px] text-mut">검색 결과가 없어요.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                    {!tracksByAlbum[al.id] && <li className="text-xs text-mut">불러오는 중…</li>}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
        {filteredStandings.length === 0 && (
          <p className="py-4 text-sm text-mut">검색 결과가 없습니다.</p>
        )}
        {manageTotalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <button
              onClick={() => setManagePage((p) => Math.max(1, p - 1))}
              disabled={safeManagePage === 1}
              className="rounded-full border border-line px-3 py-1.5 disabled:opacity-30"
            >
              이전
            </button>
            <span className="text-mut">
              {safeManagePage} / {manageTotalPages}
            </span>
            <button
              onClick={() => setManagePage((p) => Math.min(manageTotalPages, p + 1))}
              disabled={safeManagePage === manageTotalPages}
              className="rounded-full border border-line px-3 py-1.5 disabled:opacity-30"
            >
              다음
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
