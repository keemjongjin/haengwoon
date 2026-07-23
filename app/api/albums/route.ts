import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { spotify } from "@/lib/spotify";
import { isAdmin } from "@/lib/auth";
import { eloToScore10 } from "@/lib/elo";

// 등록은 Spotify 메타데이터만 저장해 빠르게 끝난다(미리듣기는 등록 후 backfill로 채움).
// Spotify API 응답이 느릴 때를 대비해 기본 타임아웃(10s)보다 약간의 여유만 둔다.
export const maxDuration = 30;

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
  try {
    const album = await spotify.getAlbum(spotifyAlbumId);
    if (!album) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    const row = await repo.addAlbumFromSpotify(album);
    const withTracks = await repo.getAlbumWithTracks(row.id);
    return NextResponse.json({ ok: true, album: row, tracks: withTracks?.tracks ?? [] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
