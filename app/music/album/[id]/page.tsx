import { notFound } from "next/navigation";
import { repo } from "@/lib/db/repo";
import { eloToScore10 } from "@/lib/elo";
import { Cover } from "@/components/music/Cover";
import { TrackList } from "@/components/music/TrackList";
import { LikeButton } from "@/components/music/LikeButton";
import { AlbumComments } from "@/components/features/AlbumComments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = repo.getAlbumWithTracks(Number(id));
  return { title: data ? `${data.album.title} — Haengwoon` : "Album" };
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = repo.getAlbumWithTracks(Number(id));
  if (!data) notFound();
  const { album, tracks } = data;

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row">
        <Cover id={album.id} title={album.title} url={album.coverImageUrl} size={160} />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{album.title}</h1>
          <p className="mt-1 text-mut">
            {album.artist}
            {album.genre && ` · ${album.genre}`}
          </p>

          {/* 두 점수 (평점 ⟂ Elo, 별개 지표) */}
          <div className="mt-5 flex gap-8">
            <div>
              <p className="text-xs text-mut">평점 (내 점수)</p>
              <p className="text-2xl font-bold">
                {album.manualRating ?? "–"}
                <span className="text-sm font-medium text-mut">/10</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-mut">Elo (취향 대결)</p>
              <p className="text-2xl font-bold">
                {album.eloRating}
                <span className="ml-1 text-sm font-medium text-mut">
                  ({eloToScore10(album.eloRating)})
                </span>
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              disabled
              className="cursor-not-allowed rounded-full border border-line px-5 py-2 text-sm text-mut"
            >
              ▶ 재생 (Spotify 미연결 · mock)
            </button>
            <LikeButton albumId={album.id} />
          </div>
        </div>
      </div>

      {album.review && (
        <p className="mt-8 border-l-2 border-acc pl-4 text-mut">{album.review}</p>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-mut">수록곡 (🔥 = 최애)</h2>
        <TrackList tracks={tracks} />
      </section>

      <AlbumComments albumId={album.id} />
    </div>
  );
}
