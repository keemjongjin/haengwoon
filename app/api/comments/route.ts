import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { hashPassword } from "@/lib/hash";
import { checkSpam } from "@/lib/spam";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

// GET /api/comments?targetType=album&targetId=1
export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetType = url.searchParams.get("targetType") || "album";
  const targetId = Number(url.searchParams.get("targetId"));
  const list = await repo.listComments(targetType, targetId);
  const comments = list.map((c) => ({
    id: c.id,
    authorName: c.authorName,
    content: c.content,
    createdAt: c.createdAt,
  }));
  return NextResponse.json({ comments });
}

// POST /api/comments  { targetType, targetId, authorName, password, content, honeypot, elapsedMs }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { targetType = "album", targetId, authorName, password, content, honeypot, elapsedMs } = body;

  if (!authorName || !password || !content) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }

  const spam = checkSpam({ content, honeypot, elapsedMs, ip: clientIp(req) });
  if (!spam.ok) {
    return NextResponse.json({ ok: false, error: `spam:${spam.reason}` }, { status: 429 });
  }

  const comment = await repo.addComment({
    targetType,
    targetId: Number(targetId),
    authorName: String(authorName).slice(0, 64),
    passwordHash: hashPassword(String(password)),
    content: String(content),
  });
  return NextResponse.json({
    ok: true,
    comment: { id: comment.id, authorName: comment.authorName, content: comment.content, createdAt: comment.createdAt },
  });
}

// DELETE /api/comments  { id, password }
export async function DELETE(req: Request) {
  const { id, password } = await req.json().catch(() => ({}));
  const ok = await repo.deleteComment(Number(id), hashPassword(String(password)));
  if (!ok) {
    return NextResponse.json({ ok: false, error: "wrong password or not found" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
