import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";
import { isAdmin } from "@/lib/auth";

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

// PATCH /api/albums/:id  { title?, artist?, genre? } → 앨범 기본정보 수정 (관리자 전용)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { title, artist, genre } = await req.json().catch(() => ({}));
  const data: { title?: string; artist?: string; genre?: string | null } = {};
  if (typeof title === "string" && title.trim()) data.title = title.trim();
  if (typeof artist === "string" && artist.trim()) data.artist = artist.trim();
  if (typeof genre === "string") data.genre = genre.trim() || null;
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
