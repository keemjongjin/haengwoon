import { repo } from "@/lib/db/repo";
import { eloToScore10 } from "@/lib/elo";
import { ChartsFilters } from "@/components/music/ChartsFilters";

export const metadata = { title: "Charts — Haengwoon" };
export const dynamic = "force-dynamic";

export default async function ChartsPage() {
  const [all, favorites] = await Promise.all([repo.listAlbums(), repo.listFavoriteTracks()]);
  const albums = all.map((a) => ({
    id: a.id,
    spotifyAlbumId: a.spotifyAlbumId,
    title: a.title,
    artist: a.artist,
    coverImageUrl: a.coverImageUrl,
    albumType: a.albumType,
    reviewDate: a.reviewDate,
    manualRating: a.manualRating,
    eloScore10: eloToScore10(a.eloRating),
    review: a.review,
    favoriteTrack: favorites[a.id]
      ? {
          id: favorites[a.id].id,
          title: favorites[a.id].title,
          previewUrl: favorites[a.id].previewUrl,
        }
      : null,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Charts</h1>
        <p className="mt-1 text-sm text-mut">평점과 Elo는 별개의 지표입니다</p>
      </div>
      <ChartsFilters albums={albums} />
    </div>
  );
}
