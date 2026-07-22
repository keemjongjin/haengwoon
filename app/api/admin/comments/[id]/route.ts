import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// PATCH /api/admin/comments/:id  { isHidden }  → 숨김/숨김해제 (관리자 전용)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { isHidden } = await req.json().catch(() => ({}));
  const row = await repo.setCommentHidden(Number(id), Boolean(isHidden));
  if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, comment: row });
}

// DELETE /api/admin/comments/:id → 비밀번호 없이 강제 삭제 (관리자 전용)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await repo.adminDeleteComment(Number(id));
  if (!ok) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
