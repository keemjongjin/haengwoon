import { NextResponse } from "next/server";
import { checkAdminKey, issueToken, AUTH_COOKIE } from "@/lib/auth";

// POST /api/auth  { key }  → 성공 시 관리자 JWT 쿠키 발급
export async function POST(req: Request) {
  const { key } = await req.json().catch(() => ({ key: "" }));
  if (!checkAdminKey(key)) {
    return NextResponse.json({ ok: false, error: "invalid key" }, { status: 401 });
  }
  const token = await issueToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

// DELETE /api/auth → 로그아웃
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
