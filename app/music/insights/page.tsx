import { repo } from "@/lib/db/repo";
import { eloToScore10 } from "@/lib/elo";

export const metadata = { title: "Insights — Haengwoon" };

// 평점 vs Elo 불일치 = 버그가 아니라 콘텐츠 (DECISIONS.log). CSS 바로 시각화.
export default function InsightsPage() {
  const albums = repo.listAlbums().filter((a) => a.manualRating != null);

  const rows = albums
    .map((a) => {
      const elo10 = eloToScore10(a.eloRating);
      return {
        id: a.id,
        title: a.title,
        artist: a.artist,
        rating: a.manualRating as number,
        elo10,
        gap: Math.round(Math.abs((a.manualRating as number) - elo10) * 10) / 10,
      };
    })
    .sort((x, y) => y.gap - x.gap);

  const totalVotes = repo.exportAll().matches.length;
  const avg =
    albums.length > 0
      ? Math.round((albums.reduce((s, a) => s + (a.manualRating ?? 0), 0) / albums.length) * 10) / 10
      : 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Insights</h1>
      <p className="mt-1 text-sm text-mut">평점과 Elo는 다른 걸 측정합니다. 그 차이가 곧 취향의 재미.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ["앨범", albums.length],
          ["누적 투표", totalVotes],
          ["평균 평점", avg],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl bg-card p-4">
            <p className="text-xs text-mut">{label}</p>
            <p className="mt-1 text-2xl font-bold">{val}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-4 text-sm font-medium text-mut">
        🔥 평점과 Elo가 가장 다른 앨범
      </h2>
      <ul className="space-y-5">
        {rows.map((r) => (
          <li key={r.id}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">
                {r.title} <span className="text-mut">— {r.artist}</span>
              </span>
              <span className="text-mut">차이 {r.gap}</span>
            </div>
            <div className="space-y-1">
              <Bar label="평점" value={r.rating} color="var(--fg)" />
              <Bar label="Elo" value={r.elo10} color="var(--acc)" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-mut">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full"
          style={{ width: `${(value / 10) * 100}%`, background: color }}
        />
      </div>
      <span className="w-8 text-right font-medium">{value}</span>
    </div>
  );
}
