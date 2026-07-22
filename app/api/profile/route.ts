import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

// GET /api/profile → 스토리 공유 카드에 쓰는 프로필 (공개, 이름/사진 URL만)
export async function GET() {
  const profile = await repo.getProfile();
  return NextResponse.json({ ok: true, profile });
}

// PATCH /api/profile  { displayName, photoUrl }  → 프로필 수정 (관리자 전용)
export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { displayName, photoUrl } = await req.json().catch(() => ({}));
  if (typeof displayName !== "string" || !displayName.trim()) {
    return NextResponse.json({ ok: false, error: "invalid displayName" }, { status: 400 });
  }
  await repo.setProfile({
    displayName: displayName.trim(),
    photoUrl: typeof photoUrl === "string" && photoUrl.trim() ? photoUrl.trim() : null,
  });
  return NextResponse.json({ ok: true });
}
