import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";

// POST /api/track  { path }  → 방문 기록 (공개, 인증 불필요). 자체 집계 방문자 카운터.
export async function POST(req: Request) {
  const { path } = await req.json().catch(() => ({}));
  if (typeof path === "string" && path.length > 0 && path.length < 300) {
    await repo.recordVisit(path);
  }
  return NextResponse.json({ ok: true });
}
