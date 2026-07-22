import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// PATCH /api/albums/:id/rating  { rating }  → 평점(내 점수) 지정 (관리자 전용)
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
  const row = await repo.setManualRating(Number(id), num);
  if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, album: row });
}
