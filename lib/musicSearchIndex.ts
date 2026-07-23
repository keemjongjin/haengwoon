import { repo } from "@/lib/db/repo";

// /music/search 페이지용 검색 인덱스 (앨범+아티스트+수록곡 검색 대상 데이터 조합)
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
