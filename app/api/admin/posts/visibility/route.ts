import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// GET /api/admin/posts/visibility → 슬러그별 숨김 여부 (관리자 전용)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const hidden = await repo.getHiddenSlugs();
  return NextResponse.json({ ok: true, hidden: Array.from(hidden) });
}

// POST /api/admin/posts/visibility  { slug, hidden }  → 글 노출/숨김 전환 (관리자 전용)
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { slug, hidden } = await req.json().catch(() => ({}));
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ ok: false, error: "invalid slug" }, { status: 400 });
  }
  await repo.setPostHidden(slug, Boolean(hidden));
  return NextResponse.json({ ok: true });
}
