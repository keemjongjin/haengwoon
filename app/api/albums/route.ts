import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { spotify } from "@/lib/spotify";
import { isAdmin } from "@/lib/auth";
import { eloToScore10 } from "@/lib/elo";

// GET /api/albums → 공개 목록 (평점 + Elo 둘 다 반환)
export async function GET() {
  const albums = repo.listAlbums().map((a) => ({
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
  const row = repo.addAlbumFromSpotify(album);
  return NextResponse.json({ ok: true, album: row });
}
