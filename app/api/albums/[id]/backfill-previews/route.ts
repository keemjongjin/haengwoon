import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";
import { fetchItunesPreviewUrl, sleep } from "@/lib/itunes";

// iTunes 요청이 곡당 3초 간격이라 트랙 많은 앨범은 시간이 걸림 — Vercel 기본 타임아웃(10s)보다 길게 확보.
export const maxDuration = 60;

// POST /api/albums/:id/backfill-previews → iTunes에서 미리듣기 재조회해 빈 트랙만 채움 (관리자 전용)
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const data = await repo.getAlbumWithTracks(Number(id));
  if (!data) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  let filled = 0;
  for (const t of data.tracks) {
    if (t.previewUrl) continue;
    const url = await fetchItunesPreviewUrl(t.title, data.album.artist).catch(() => null);
    if (url) {
      await repo.setTrackPreviewUrl(t.id, url);
      filled += 1;
    }
    await sleep(3000); // iTunes 공식 제한(약 분당 20회 = 3초 간격) 준수
  }

  const updated = await repo.getAlbumWithTracks(Number(id));
  return NextResponse.json({ ok: true, filled, tracks: updated?.tracks ?? [] });
}
