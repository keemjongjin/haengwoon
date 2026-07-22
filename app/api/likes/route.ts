import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

// GET /api/likes?targetType=album&targetId=1
export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetType = url.searchParams.get("targetType") || "album";
  const targetId = Number(url.searchParams.get("targetId"));
  const ip = clientIp(req);
  const [count, liked] = await Promise.all([
    repo.getLikes(targetType, targetId),
    repo.hasLiked(targetType, targetId, ip),
  ]);
  return NextResponse.json({ count, liked });
}

// POST /api/likes  { targetType, targetId } — IP 기준 토글(좋아요 ⟷ 취소)
export async function POST(req: Request) {
  const { targetType = "album", targetId } = await req.json().catch(() => ({}));
  const { count, liked } = await repo.toggleLike(targetType, Number(targetId), clientIp(req));
  return NextResponse.json({ ok: true, count, liked });
}
