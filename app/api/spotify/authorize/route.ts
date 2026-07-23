import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { isAdmin } from "@/lib/auth";
import { buildSpotifyAuthorizeUrl, SPOTIFY_STATE_COOKIE } from "@/lib/spotify";

// GET /api/spotify/authorize → 관리자 본인 Spotify 계정 인증 시작 (재생용 refresh token 발급)
// CSRF 방지용 state를 발급해 짧은 유효시간의 쿠키로 저장하고, 콜백에서 대조 확인.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildSpotifyAuthorizeUrl(state));
  res.cookies.set(SPOTIFY_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10분 — 인증 흐름 완료까지 충분
  });
  return res;
}
