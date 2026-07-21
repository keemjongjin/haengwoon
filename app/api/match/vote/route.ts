import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// POST /api/match/vote  { winnerId, loserId }  → Elo 재계산 (관리자 전용)
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { winnerId, loserId } = await req.json().catch(() => ({}));
  const result = repo.vote(Number(winnerId), Number(loserId));
  if (!result) {
    return NextResponse.json({ ok: false, error: "invalid vote" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...result });
}
