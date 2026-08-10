"use client";

// /admin/music 안의 "월간 추천" 편집 섹션. /music 홈 최상단 LP 캐러셀에 노출될 앨범을
// 매달 최대 10장까지 직접 고르고 순서를 정한다.
//
// 저장은 부분 수정이 아니라 "그 달 목록 통째로 교체"(PUT) 방식이라, 추가·삭제·순서변경을
// 한 번의 저장으로 처리할 수 있다. 순서는 드래그 대신 ↑↓ 버튼 — 항목이 10개 이하라
// 드래그 라이브러리를 들일 만큼의 이득이 없다.

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { todayKST } from "@/lib/format";
import { useAdminToast, describeFailure } from "./AdminToastContext";

const MAX_PICKS = 10;

/** 후보 목록·선택 목록에 공통으로 쓰는 최소 앨범 정보. */
type PickableAlbum = {
  id: number;
  title: string;
  artist: string;
  coverImageUrl: string | null;
};

export function MonthlyPicksAdmin({ albums }: { albums: PickableAlbum[] }) {
  const { showError, showSuccess } = useAdminToast();
  const [yearMonth, setYearMonth] = useState(() => todayKST().slice(0, 7));
  const [picked, setPicked] = useState<PickableAlbum[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 월이 바뀔 때마다 그 달의 추천 목록을 불러온다.
  // "불러오는 중" 표시는 100ms 넘게 걸릴 때만 켠다 — 이펙트 본문에서 곧바로 setState 하면
  // 불필요한 연쇄 렌더가 생기고(react-hooks/set-state-in-effect), 응답이 빠를 땐 스피너가
  // 깜빡였다 사라져 오히려 지저분하기 때문.
  useEffect(() => {
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) return;
    let alive = true;
    let settled = false;
    const slowTimer = setTimeout(() => {
      if (alive && !settled) setLoading(true);
    }, 100);

    (async () => {
      try {
        const res = await fetch(`/api/monthly-picks?ym=${yearMonth}`);
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (res.ok && data?.ok) setPicked(data.albums);
        else showError(await describeFailure(res));
      } catch {
        if (alive) showError("월간 추천을 불러오지 못했어요.");
      } finally {
        settled = true;
        clearTimeout(slowTimer);
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      clearTimeout(slowTimer);
    };
  }, [yearMonth, showError]);

  const pickedIds = useMemo(() => new Set(picked.map((p) => p.id)), [picked]);

  // 이미 고른 앨범은 후보에서 제외 — 중복 추가를 UI 단계에서 막는다.
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return albums
      .filter((a) => !pickedIds.has(a.id))
      .filter((a) => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q))
      .slice(0, 8);
  }, [albums, query, pickedIds]);

  function add(album: PickableAlbum) {
    if (picked.length >= MAX_PICKS) {
      showError(`최대 ${MAX_PICKS}장까지만 고를 수 있어요.`);
      return;
    }
    setPicked((p) => [...p, album]);
    setQuery("");
  }

  function remove(id: number) {
    setPicked((p) => p.filter((a) => a.id !== id));
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= picked.length) return;
    setPicked((p) => {
      const copy = [...p];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/monthly-picks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearMonth, albumIds: picked.map((a) => a.id) }),
      });
      if (res.ok) showSuccess(`${yearMonth} 추천 ${picked.length}장을 저장했어요.`);
      else showError(await describeFailure(res));
    } catch {
      showError("네트워크 오류로 저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-medium text-mut">💿 월간 추천 (Music 홈 상단 캐러셀)</h2>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => setYearMonth(e.target.value)}
          className="rounded-lg border border-line bg-card px-3 py-1.5 text-sm outline-none focus:border-acc"
        />
        <span className="text-xs text-mut">
          {picked.length} / {MAX_PICKS}장
        </span>
        <button
          onClick={save}
          disabled={saving || loading}
          className="ml-auto rounded-full bg-acc px-4 py-1.5 text-xs font-semibold text-on-acc disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>

      {/* 고른 앨범 — 위에서부터 캐러셀에 보일 순서 */}
      {loading ? (
        <p className="py-4 text-xs text-mut">불러오는 중…</p>
      ) : picked.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line py-6 text-center text-xs text-mut">
          아직 고른 앨범이 없습니다. 아래에서 검색해 추가하세요.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {picked.map((a, i) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-line bg-card px-2 py-1.5 text-sm"
            >
              <span className="w-5 shrink-0 text-center text-xs font-bold text-mut">{i + 1}</span>
              {a.coverImageUrl ? (
                <Image src={a.coverImageUrl} alt={a.title} width={32} height={32} className="h-8 w-8 shrink-0 rounded" />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded bg-bg" />
              )}
              <span className="min-w-0 flex-1 truncate">
                {a.title} <span className="text-mut">— {a.artist}</span>
              </span>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="위로"
                className="shrink-0 px-1 text-mut hover:text-fg disabled:opacity-25"
              >
                ↑
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === picked.length - 1}
                aria-label="아래로"
                className="shrink-0 px-1 text-mut hover:text-fg disabled:opacity-25"
              >
                ↓
              </button>
              <button
                onClick={() => remove(a.id)}
                aria-label="제외"
                className="shrink-0 px-1 text-red-500 hover:opacity-70"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 앨범 검색해서 추가 */}
      <div className="mt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="추가할 앨범 검색 (제목 또는 아티스트)"
          disabled={picked.length >= MAX_PICKS}
          className="w-full rounded-xl border border-line bg-card px-4 py-2 text-sm outline-none focus:border-acc disabled:opacity-50"
        />
        {candidates.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {candidates.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => add(a)}
                  className="flex w-full items-center gap-3 rounded-lg border border-line px-2 py-1.5 text-left text-sm hover:border-acc"
                >
                  {a.coverImageUrl ? (
                    <Image src={a.coverImageUrl} alt={a.title} width={28} height={28} className="h-7 w-7 shrink-0 rounded" />
                  ) : (
                    <div className="h-7 w-7 shrink-0 rounded bg-card" />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {a.title} <span className="text-mut">— {a.artist}</span>
                  </span>
                  <span className="shrink-0 text-xs text-acc">추가</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
