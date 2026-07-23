import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// PATCH /api/tracks/:id/preview  { previewUrl }  → 미리듣기 URL 수동 지정/수정 (관리자 전용)
// Deezer 자동 매칭이 다른 곡을 잘못 물어왔을 때 직접 바로잡거나(프록시 경로 붙여넣기), 빈 문자열로 해제.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { previewUrl } = await req.json().catch(() => ({}));
  const trimmed = typeof previewUrl === "string" ? previewUrl.trim() : "";
  const row = await repo.setTrackPreviewUrl(Number(id), trimmed || null);
  if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, track: row });
}
