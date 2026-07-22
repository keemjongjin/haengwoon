import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { spotify } from "@/lib/spotify";
import { isAdmin } from "@/lib/auth";
import { eloToScore10 } from "@/lib/elo";

// iTunes 미리듣기 조회가 곡당 3초 간격(공식 요청 제한 준수)이라 트랙 많은 앨범은
// 등록에 시간이 걸림 — Vercel 기본 타임아웃(10s)보다 길게 확보.
export const maxDuration = 60;

// GET /api/albums → 공개 목록 (평점 + Elo 둘 다 반환)
export async function GET() {
  const list = await repo.listAlbums();
  const albums = list.map((a) => ({
    ...a,
    eloScore10: eloToScore10(a.eloRating),
  }));
  return NextResponse.json({ albums });
}

// POST /api/albums  { spotifyAlbumId }  → Spotify에서 가져와 등록 (관리자)
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { spotifyAlbumId } = await req.json().catch(() => ({}));
  const album = await spotify.getAlbum(spotifyAlbumId);
  if (!album) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  const row = await repo.addAlbumFromSpotify(album);
  const withTracks = await repo.getAlbumWithTracks(row.id);
  return NextResponse.json({ ok: true, album: row, tracks: withTracks?.tracks ?? [] });
}
