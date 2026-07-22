import { exchangeSpotifyCode } from "@/lib/spotify";

function htmlPage(bodyHtml: string, status = 200) {
  return new Response(
    `<!doctype html><html><body style="font-family:-apple-system,sans-serif;max-width:640px;margin:60px auto;line-height:1.6;padding:0 20px;">${bodyHtml}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// GET /api/spotify/callback?code=... → Spotify OAuth 리다이렉트 수신처.
// code를 refresh_token으로 교환해 화면에 1회 표시(관리자가 .env.local에 직접 붙여넣음).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return htmlPage(`<h2>❌ 인증이 취소되었습니다</h2><p>${error}</p>`, 400);
  }
  if (!code) {
    return htmlPage(`<h2>❌ code 파라미터가 없습니다</h2>`, 400);
  }

  try {
    const tokens = await exchangeSpotifyCode(code);
    return htmlPage(`
      <h2>✅ Spotify 인증 완료</h2>
      <p>아래 값을 <code>.env.local</code>의 <code>SPOTIFY_REFRESH_TOKEN</code>에 붙여넣고
      개발 서버를 재시작하세요.</p>
      <pre style="background:#f4f4f4;padding:16px;border-radius:8px;word-break:break-all;user-select:all;">${tokens.refresh_token}</pre>
      <p style="color:#888;font-size:13px;">이 화면은 다시 열어도 값이 재발급되지 않습니다. 지금 복사해두세요.</p>
    `);
  } catch (e) {
    return htmlPage(`<h2>❌ 토큰 교환 실패</h2><p>${(e as Error).message}</p>`, 500);
  }
}
