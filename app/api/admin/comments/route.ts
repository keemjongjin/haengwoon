import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// GET /api/admin/comments → 전체 댓글(숨김 포함) 최신순 (관리자 전용)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const comments = await repo.listAllComments(100);
  return NextResponse.json({ comments });
}
