import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// GET /api/backup → 전체 데이터 JSON 덤프 (관리자 전용)
// 블로그 글은 git 저장소(content/posts/*.mdx)가 곧 백업이라 여기 포함 안 함.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const music = await repo.exportAll();
  return NextResponse.json(music, {
    headers: { "Content-Disposition": 'attachment; filename="backup.json"' },
  });
}
