import { getDeezerPreviewUrl } from "@/lib/deezer";

// GET /api/deezer-preview/:id → Deezer 트랙 ID로 지금 유효한 미리듣기 URL을 받아 302 리다이렉트.
// Deezer 미리듣기 URL은 ~15분 만료라 저장할 수 없으므로, <audio src>는 이 안정적인 주소를 가리키고
// 실제 재생 직전에 매번 신선한 URL로 넘겨준다. (공개 — 30초 미리듣기 스트림, 민감정보 없음)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = await getDeezerPreviewUrl(id).catch(() => null);
  if (!url) {
    return new Response("preview not found", { status: 404 });
  }
  // no-store: 리다이렉트 대상 URL이 곧 만료되므로 브라우저가 캐시해 재사용하지 않게 함.
  return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store" } });
}
