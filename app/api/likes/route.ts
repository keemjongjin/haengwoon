import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";

// GET /api/likes?targetType=album&targetId=1
export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetType = url.searchParams.get("targetType") || "album";
  const targetId = Number(url.searchParams.get("targetId"));
  return NextResponse.json({ count: repo.getLikes(targetType, targetId) });
}

// POST /api/likes  { targetType, targetId }
export async function POST(req: Request) {
  const { targetType = "album", targetId } = await req.json().catch(() => ({}));
  const count = repo.addLike(targetType, Number(targetId));
  return NextResponse.json({ ok: true, count });
}
