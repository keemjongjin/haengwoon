import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/security/auth";

// 월간 추천 앨범 (/music 홈 LP 캐러셀 + 관리자 편집).
// GET은 공개(방문자가 캐러셀에서 달을 넘길 때 호출), PUT은 관리자 전용.

/** GET /api/monthly-picks?ym=2026-08 → 해당 월 추천 목록 + 추천이 있는 전체 월 목록 */
export async function GET(req: Request) {
  const ym = new URL(req.url).searchParams.get("ym") ?? "";
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    return NextResponse.json({ ok: false, error: "invalid ym (expected YYYY-MM)" }, { status: 400 });
  }
  const [albums, months] = await Promise.all([repo.listMonthlyPicks(ym), repo.listPickMonths()]);
  return NextResponse.json({ ok: true, yearMonth: ym, albums, months });
}

/** PUT /api/monthly-picks  { yearMonth, albumIds[] } → 해당 월 목록 통째로 교체 (관리자 전용) */
export async function PUT(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { yearMonth, albumIds } = await req.json().catch(() => ({}));
  if (!/^\d{4}-\d{2}$/.test(yearMonth ?? "")) {
    return NextResponse.json({ ok: false, error: "invalid yearMonth" }, { status: 400 });
  }
  if (!Array.isArray(albumIds) || albumIds.some((id) => !Number.isInteger(id))) {
    return NextResponse.json({ ok: false, error: "albumIds must be an integer array" }, { status: 400 });
  }
  try {
    await repo.setMonthlyPicks(yearMonth, albumIds);
    const albums = await repo.listMonthlyPicks(yearMonth);
    return NextResponse.json({ ok: true, albums });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
