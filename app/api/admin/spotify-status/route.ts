import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { hasClientCreds, hasPlaybackCreds, spotify } from "@/lib/spotify";

// GET /api/admin/spotify-status → Spotify 연결 상태를 실제로 검증(관리자 전용, 클릭 시에만 호출)
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const clientConfigured = hasClientCreds();
  const playbackConfigured = hasPlaybackCreds();

  if (!playbackConfigured) {
    return NextResponse.json({ ok: true, clientConfigured, playbackConfigured, valid: false });
  }

  try {
    const token = await spotify.getPlaybackToken();
    return NextResponse.json({
      ok: true,
      clientConfigured,
      playbackConfigured,
      valid: true,
      expiresAt: token.expiresAt,
    });
  } catch (e) {
    return NextResponse.json({
      ok: true,
      clientConfigured,
      playbackConfigured,
      valid: false,
      error: (e as Error).message,
    });
  }
}
