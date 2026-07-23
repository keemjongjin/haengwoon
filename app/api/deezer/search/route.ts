import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { searchDeezerTracks } from "@/lib/deezer";

// GET /api/deezer/search?term=... → Deezer 검색 프록시 (관리자 전용).
// 자동 매칭이 틀린 트랙의 미리듣기를 관리자가 직접 찾아 고를 때 사용.
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const term = url.searchParams.get("term")?.trim();
  if (!term) {
    return NextResponse.json({ ok: false, error: "term이 필요합니다" }, { status: 400 });
  }
  try {
    const results = await searchDeezerTracks(term);
    return NextResponse.json({ ok: true, results });
  } catch {
    return NextResponse.json({ ok: false, error: "Deezer 검색 실패" }, { status: 502 });
  }
}
