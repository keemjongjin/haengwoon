import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";
import { matchDeezerTrackId, deezerProxyUrl, sleep } from "@/lib/deezer";

// Deezer는 rate limit이 여유로워(50req/5s) 곡 사이 짧은 간격이면 충분 — 타임아웃 여유만 살짝.
export const maxDuration = 30;

// POST /api/albums/:id/backfill-previews → Deezer에서 미리듣기 재조회해 빈 트랙만 채움 (관리자 전용).
// previewUrl 컬럼에는 만료되는 Deezer URL 대신 프록시 경로(/api/deezer-preview/{id})를 저장한다.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const data = await repo.getAlbumWithTracks(Number(id));
  if (!data) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  const needing = data.tracks.filter((t) => !t.previewUrl);
  let filled = 0;
  for (let i = 0; i < needing.length; i++) {
    const deezerId = await matchDeezerTrackId(needing[i].title, data.album.artist).catch(() => null);
    if (deezerId) {
      await repo.setTrackPreviewUrl(needing[i].id, deezerProxyUrl(deezerId));
      filled += 1;
    }
    if (i < needing.length - 1) await sleep(250); // 곡 사이 짧은 간격 (rate limit 여유)
  }

  const updated = await repo.getAlbumWithTracks(Number(id));
  return NextResponse.json({ ok: true, filled, tracks: updated?.tracks ?? [] });
}
