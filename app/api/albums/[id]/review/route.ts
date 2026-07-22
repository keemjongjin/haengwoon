import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// PATCH /api/albums/:id/review  { review }  → 리뷰(코멘트) 설정 (관리자 전용)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { review } = await req.json().catch(() => ({}));
  const row = await repo.setReview(Number(id), String(review ?? ""));
  if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, album: row });
}
