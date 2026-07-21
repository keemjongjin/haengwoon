import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// GET /api/match → 월드컵 매치업 2개 (관리자 전용)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const pair = repo.getMatchup();
  if (!pair) {
    return NextResponse.json({ ok: false, error: "not enough albums" }, { status: 400 });
  }
  return NextResponse.json({ ok: true, a: pair[0], b: pair[1] });
}
