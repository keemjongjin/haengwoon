import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// GET /api/backup → 전체 데이터 JSON 덤프 (관리자 전용)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(repo.exportAll(), {
    headers: { "Content-Disposition": 'attachment; filename="backup.json"' },
  });
}
