import Link from "next/link";
import { repo } from "@/lib/db/repo";
import { ratingColor } from "@/lib/rating";
import { Cover } from "@/components/music/Cover";
import { AlbumRatingCard } from "@/components/music/AlbumRatingCard";
import { HeroFavoriteTrack } from "@/components/music/HeroFavoriteTrack";

export const metadata = { title: "Music — Haengwoon" };
export const dynamic = "force-dynamic"; // DB 데이터 매 요청 최신화 (투표·평점 반영)

export default async function MusicHome() {
  const [recent, recentList, favorites] = await Promise.all([
    repo.recentReview(),
    repo.recentReviews(5),
    repo.listFavoriteTracks(),
  ]);

  const heroTracks = recent ? (await repo.getAlbumWithTracks(recent.id))?.tracks ?? [] : [];
  const heroFavorite = heroTracks.find((t) => t.isFavorite);

  const cards = recentList.map((a) => ({
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
  }));

  return (
    <div>
      {/* 최근 리뷰 히어로 — 화면 정중앙, 크게 */}
      {recent && (
        <section className="flex min-h-[80vh] flex-col items-center justify-center text-center">
          <p className="mb-3 text-sm text-mut">{recent.reviewDate} 리뷰</p>
          <Link href={`/music/album/${recent.spotifyAlbumId ?? recent.id}`}>
            <Cover id={recent.id} title={recent.title} url={recent.coverImageUrl} size={220} />
          </Link>
          <Link href={`/music/album/${recent.spotifyAlbumId ?? recent.id}`}>
            <h1 className="mt-6 text-4xl font-bold hover:text-acc sm:text-5xl">{recent.title}</h1>
          </Link>
          <Link href={`/artist/${encodeURIComponent(recent.artist)}`}>
            <p className="mt-2 text-lg text-mut hover:text-fg hover:underline">{recent.artist}</p>
          </Link>
          <p
            className="mt-5 text-5xl font-bold"
            style={recent.manualRating != null ? { color: ratingColor(recent.manualRating) } : undefined}
          >
            {recent.manualRating}
            <span className="ml-1 text-lg font-medium text-mut">/ 10</span>
          </p>
          {recent.review && <p className="mt-4 max-w-md text-mut">{recent.review}</p>}
          {heroFavorite && <HeroFavoriteTrack id={heroFavorite.id} title={heroFavorite.title} />}
        </section>
      )}

      {/* 최근 리뷰 5개 */}
      <section className="py-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">최근 리뷰</h2>
          <Link href="/music/archive" className="text-sm text-mut hover:text-acc">
            더보기 →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {cards.map((a) => (
            <AlbumRatingCard key={a.id} album={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
