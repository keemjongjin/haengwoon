import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// PATCH /api/tracks/:id/rating  { rating }  → 곡별 평점 지정 (관리자 전용)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { rating } = await req.json().catch(() => ({}));
  const num = Number(rating);
  if (Number.isNaN(num)) {
    return NextResponse.json({ ok: false, error: "invalid rating" }, { status: 400 });
  }
  const row = await repo.setTrackRating(Number(id), num);
  if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, track: row });
}
