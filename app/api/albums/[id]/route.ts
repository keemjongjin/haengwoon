import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/security/auth";
import { LP_PATTERNS } from "@/lib/media/lpDesign";

// GET /api/albums/:id → 앨범 + 수록곡 (관리자 패널의 곡별 평점 편집용)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const data = await repo.getAlbumWithTracks(Number(id));
  if (!data) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, album: data.album, tracks: data.tracks });
}

// PATCH /api/albums/:id  { title?, artist?, genre?, lpColor?, lpPattern? } → 앨범 기본정보 수정 (관리자 전용)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { title, artist, genre, lpColor, lpPattern } = await req.json().catch(() => ({}));
  const data: {
    title?: string;
    artist?: string;
    genre?: string | null;
    lpColor?: string | null;
    lpPattern?: string | null;
  } = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof artist === "string" && artist.trim()) data.artist = artist.trim();
  if (typeof genre === "string") data.genre = genre.trim() || null;
  // LP판 디자인 — 값을 그대로 믿지 않고 허용된 형식/목록만 통과시킨다.
  // (색은 #rrggbb, 무늬는 정해진 네 가지. 빈 문자열은 "기본으로 되돌리기" 의미의 null.)
  if (typeof lpColor === "string") {
    const v = lpColor.trim();
    if (!v) data.lpColor = null;
    else if (/^#[0-9a-f]{6}$/i.test(v)) data.lpColor = v.toLowerCase();
    else return NextResponse.json({ ok: false, error: "invalid lpColor" }, { status: 400 });
  }
  if (typeof lpPattern === "string") {
    const v = lpPattern.trim();
    if (!v) data.lpPattern = null;
    else if (LP_PATTERNS.some((p) => p.id === v)) data.lpPattern = v;
    else return NextResponse.json({ ok: false, error: "invalid lpPattern" }, { status: 400 });
  }
  const row = await repo.updateAlbumMeta(Number(id), data);
  if (!row) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, album: row });
}

// DELETE /api/albums/:id → 앨범 삭제 (관리자 전용)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await repo.deleteAlbum(Number(id));
  if (!ok) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
