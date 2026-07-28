// /music/search 전용 검색 인덱스. Tech 블로그 검색(lib/content/search.ts)과 달리 파일이 아니라
// DB(albums/tracks)에서 매 요청마다 조합해서 만든다 — 앨범 수가 적어 정적 인덱싱이 필요 없다.
import { repo } from "@/lib/db/repo";

/**
 * 앨범 목록 + 앨범별 최애곡 + 전체 수록곡 제목을 한 번에 조회해, 검색(제목/아티스트/수록곡명)에
 * 필요한 형태로 합쳐 반환한다. `favoriteTrack`은 최애곡이 지정된 앨범만 채워짐(없으면 null).
 */
export async function buildMusicSearchIndex() {
  const [all, favorites, allTracks] = await Promise.all([
    repo.listAlbums(),
    repo.listFavoriteTracks(),
    repo.listAllTracks(),
  ]);

  const tracksByAlbum = new Map<number, string[]>();
  for (const t of allTracks) {
    const arr = tracksByAlbum.get(t.albumId) ?? [];
    arr.push(t.title);
    tracksByAlbum.set(t.albumId, arr);
  }

  return all.map((a) => ({
    id: a.id,
    spotifyAlbumId: a.spotifyAlbumId,
    title: a.title,
    artist: a.artist,
    coverImageUrl: a.coverImageUrl,
    albumType: a.albumType,
    manualRating: a.manualRating,
    review: a.review,
    favoriteTrack: favorites[a.id]
      ? {
          id: favorites[a.id].id,
          title: favorites[a.id].title,
          previewUrl: favorites[a.id].previewUrl,
        }
      : null,
    trackTitles: tracksByAlbum.get(a.id) ?? [],
  }));
}
