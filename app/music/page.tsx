import Link from "next/link";
import { repo } from "@/lib/db/repo";
import { Cover } from "@/components/music/Cover";

export const metadata = { title: "Music — Haengwoon" };

export default function MusicHome() {
  const recent = repo.recentReview();
  const top = repo
    .listAlbums()
    .filter((a) => a.manualRating != null)
    .sort((a, b) => (b.manualRating ?? 0) - (a.manualRating ?? 0))
    .slice(0, 5);

  return (
    <div>
      {/* 최근 리뷰 히어로 */}
      {recent && (
        <section className="min-h-[70vh] flex flex-col justify-center">
          <p className="mb-2 text-sm text-mut">{recent.reviewDate} 리뷰</p>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <Cover id={recent.id} title={recent.title} url={recent.coverImageUrl} size={150} />
            <div>
              <Link href={`/music/album/${recent.id}`}>
                <h1 className="text-3xl font-bold hover:text-acc">{recent.title}</h1>
              </Link>
              <p className="mt-1 text-mut">{recent.artist}</p>
              <p className="mt-4 text-4xl font-bold text-acc">
                {recent.manualRating}
                <span className="ml-1 text-base font-medium text-mut">/ 10</span>
              </p>
              {recent.review && <p className="mt-3 max-w-md text-mut">{recent.review}</p>}
            </div>
          </div>
          <p className="mt-16 text-center text-sm text-mut">↓ 스크롤해서 리더보드 보기</p>
        </section>
      )}

      {/* 리더보드 미리보기 */}
      <section className="py-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">🏆 Leaderboard</h2>
          <Link href="/music/leaderboard" className="text-sm text-mut hover:text-acc">
            전체 보기 →
          </Link>
        </div>
        <ul>
          {top.map((a, i) => (
            <li key={a.id} className="flex items-center gap-4 border-b border-line py-3">
              <span className="w-6 font-bold text-acc">{i + 1}</span>
              <Cover id={a.id} title={a.title} url={a.coverImageUrl} size={40} />
              <Link href={`/music/album/${a.id}`} className="flex-1 hover:text-acc">
                <span className="font-medium">{a.title}</span>{" "}
                <span className="text-sm text-mut">— {a.artist}</span>
              </Link>
              <span className="font-bold">
                {a.manualRating}
                <span className="text-xs font-medium text-mut">/10</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
