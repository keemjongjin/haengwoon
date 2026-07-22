import { notFound } from "next/navigation";
import { repo } from "@/lib/db/repo";
import { AlbumRatingCard } from "@/components/music/AlbumRatingCard";

export const dynamic = "force-dynamic";

function decodeArtist(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: `${decodeArtist(slug)} — Haengwoon` };
}

// 아티스트 전용 페이지. 새 앨범을 등록하면 artist 필드만 일치해도 자동으로 여기 그룹화됨(수동 관리 불필요).
export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = decodeArtist(slug);

  const [albums, favorites] = await Promise.all([
    repo.getAlbumsByArtist(artist),
    repo.listFavoriteTracks(),
  ]);
  if (albums.length === 0) notFound();

  const rated = albums.filter((a) => a.manualRating != null);
  const avgRating =
    rated.length > 0
      ? Math.round((rated.reduce((s, a) => s + (a.manualRating ?? 0), 0) / rated.length) * 10) / 10
      : null;

  const cards = albums
    .slice()
    .sort((a, b) => (b.manualRating ?? 0) - (a.manualRating ?? 0))
    .map((a) => ({
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
            manualRating: favorites[a.id].manualRating,
          }
        : null,
    }));

  return (
    <div>
      <h1 className="text-2xl font-semibold">{artist}</h1>
      <p className="mt-1 text-sm text-mut">
        앨범 {albums.length}장{avgRating != null && ` · 평균 평점 ${avgRating}/10`}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4">
        {cards.map((a) => (
          <AlbumRatingCard key={a.id} album={a} />
        ))}
      </div>
    </div>
  );
}
