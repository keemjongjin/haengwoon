import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { buildSpotifyAuthorizeUrl } from "@/lib/spotify";

// GET /api/spotify/authorize → 관리자 본인 Spotify 계정 인증 시작 (재생용 refresh token 발급)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(buildSpotifyAuthorizeUrl());
}
