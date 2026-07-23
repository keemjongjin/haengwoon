import { repo } from "@/lib/db/repo";
import { ArchiveFilters } from "@/components/music/ArchiveFilters";

export const metadata = { title: "Archive — Haengwoon" };
export const dynamic = "force-dynamic";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre } = await searchParams;
  const [all, favorites] = await Promise.all([repo.listAlbums(), repo.listFavoriteTracks()]);
  const likeCounts = await repo.getLikeCountsFor(
    "album",
    all.map((a) => a.id)
  );
  const albums = all.map((a) => ({
    id: a.id,
    spotifyAlbumId: a.spotifyAlbumId,
    title: a.title,
    artist: a.artist,
    coverImageUrl: a.coverImageUrl,
    albumType: a.albumType,
    genre: a.genre,
    reviewDate: a.reviewDate,
    releaseDate: a.releaseDate,
    manualRating: a.manualRating,
    review: a.review,
    likeCount: likeCounts[a.id] ?? 0,
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
      <h1 className="mb-6 text-2xl font-semibold">Archive</h1>
      <ArchiveFilters albums={albums} initialGenre={genre} />
    </div>
  );
}
