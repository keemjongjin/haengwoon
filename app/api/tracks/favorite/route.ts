import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// POST /api/tracks/favorite  { trackId }  → 최애 토글 (관리자 전용)
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { trackId } = await req.json().catch(() => ({}));
  const track = await repo.toggleFavorite(Number(trackId));
  if (!track) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, track });
}
