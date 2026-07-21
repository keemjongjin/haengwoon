import { repo } from "@/lib/db/repo";
import { ArchiveFilters } from "@/components/music/ArchiveFilters";

export const metadata = { title: "Archive — Haengwoon" };

export default function ArchivePage() {
  const albums = repo.listAlbums().map((a) => ({
    id: a.id,
    title: a.title,
    artist: a.artist,
    coverImageUrl: a.coverImageUrl,
    genre: a.genre,
    reviewDate: a.reviewDate,
    releaseDate: a.releaseDate,
    manualRating: a.manualRating,
  }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Archive</h1>
      <ArchiveFilters albums={albums} />
    </div>
  );
}
