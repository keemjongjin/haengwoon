import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { spotify } from "@/lib/spotify";

// GET /api/spotify/search?q=... → 앨범 검색 (관리자 전용, 등록 전 미리보기)
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try {
    const albums = await spotify.searchAlbums(q);
    return NextResponse.json({ ok: true, albums });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
