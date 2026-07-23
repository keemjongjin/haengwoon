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
  // 빈 값("" | null | undefined)은 "평점 해제"로 처리 — Number("")가 0이 되어
  // 삭제해도 0.0으로 남던 문제를 여기서 막는다.
  let value: number | null;
  if (rating === "" || rating === null || rating === undefined) {
    value = null;
  } else {
    const num = Number(rating);
    if (Number.isNaN(num)) {
      return NextResponse.json({ ok: false, error: "invalid rating" }, { status: 400 });
    }
    value = num;
  }
  const row = await repo.setManualRating(Number(id), value);
  if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, album: row });
}
