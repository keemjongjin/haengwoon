import { repo } from "@/lib/db/repo";
import { eloToScore10 } from "@/lib/elo";
import { LeaderboardTabs } from "@/components/music/LeaderboardTabs";

export const metadata = { title: "Leaderboard — Haengwoon" };

// 최근 12개월(1년) 리뷰 앨범만
function within1Year(reviewDate: string | null): boolean {
  if (!reviewDate) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return new Date(reviewDate) >= cutoff;
}

export default function LeaderboardPage() {
  const albums = repo
    .listAlbums()
    .filter((a) => within1Year(a.reviewDate))
    .map((a) => ({
      id: a.id,
      title: a.title,
      artist: a.artist,
      coverImageUrl: a.coverImageUrl,
      manualRating: a.manualRating,
      eloRating: a.eloRating,
      eloScore10: eloToScore10(a.eloRating),
    }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="mt-1 text-sm text-mut">최근 1년 · 평점과 Elo는 별개의 지표입니다</p>
      </div>
      <LeaderboardTabs albums={albums} />
    </div>
  );
}
