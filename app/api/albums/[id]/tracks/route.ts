import { NextResponse } from "next/server";
import { repo } from "@/lib/db/repo";

// GET /api/albums/:id/tracks → 앨범 + 수록곡 (공개)
//
// 같은 경로의 /api/albums/:id 는 관리자 전용(수정·삭제가 붙어 있어서)이라, /music 홈 플레이어에서
// 쓸 읽기 전용 공개 엔드포인트를 따로 둔다. 노출되는 정보는 앨범 상세 페이지(/music/album/...)가
// 이미 공개로 렌더링하는 것과 동일해서 새로 새는 정보는 없다.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const albumId = Number(id);
  if (!Number.isInteger(albumId)) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }
  const data = await repo.getAlbumWithTracks(albumId);
  if (!data) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    album: {
      id: data.album.id,
      spotifyAlbumId: data.album.spotifyAlbumId,
      title: data.album.title,
      artist: data.album.artist,
      coverImageUrl: data.album.coverImageUrl,
      review: data.album.review,
    },
    tracks: data.tracks.map((t) => ({
      id: t.id,
      // Spotify 전곡 재생 시 playback_update의 playingURI와 맞춰 "지금 몇 번째 곡인지" 알아내는 데 쓴다
      spotifyTrackId: t.spotifyTrackId,
      title: t.title,
      trackNumber: t.trackNumber,
      durationMs: t.durationMs,
      previewUrl: t.previewUrl,
      isFavorite: t.isFavorite,
      manualRating: t.manualRating,
    })),
  });
}
