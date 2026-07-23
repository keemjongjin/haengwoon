import { notFound } from "next/navigation";
import Link from "next/link";
import { repo } from "@/lib/db/repo";
import { ratingColor } from "@/lib/rating";
import { Cover } from "@/components/music/Cover";
import { TrackList } from "@/components/music/TrackList";
import { AlbumPlayToolbar } from "@/components/music/AlbumPlayToolbar";
import { LikeButton } from "@/components/music/LikeButton";
import { ShareStoryButton } from "@/components/music/ShareStoryButton";
import { AlbumComments } from "@/components/features/AlbumComments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ spotifyId: string }>;
}) {
  const { spotifyId } = await params;
  const album = await repo.getAlbumBySpotifyId(spotifyId);
  return { title: album ? `${album.title} — Haengwoon` : "Album" };
}

// Spotify 앨범 ID는 22자 base62 — 시드/목 데이터(seed-1 등)와 구분해 실제 Spotify 콘텐츠일 때만 출처 표기
const REAL_SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

function formatDuration(totalMs: number): string {
  const totalMin = Math.round(totalMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ spotifyId: string }>;
}) {
  const { spotifyId } = await params;
  const album = await repo.getAlbumBySpotifyId(spotifyId);
  if (!album) notFound();
  const data = await repo.getAlbumWithTracks(album.id);
  if (!data) notFound();
  const { tracks } = data;

  const totalMs = tracks.reduce((s, t) => s + (t.durationMs ?? 0), 0);
  const hasPreview = tracks.some((t) => t.previewUrl);

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row">
        <Cover
          id={album.id}
          title={album.title}
          url={album.coverImageUrl}
          size={160}
          // 라이트: 검은 그림자로 배경과 분리 / 다크: 반투명 흰 링으로 분리 (각각 반대 테마선 자연히 안 보임)
          className="shadow-lg shadow-black/20 ring-1 ring-white/10"
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{album.title}</h1>
          <p className="mt-1 text-mut">
            <Link href={`/artist/${encodeURIComponent(album.artist)}`} className="hover:text-acc hover:underline">
              {album.artist}
            </Link>
            {album.genre && (
              <>
                {" · "}
                <Link
                  href={`/music/archive?genre=${encodeURIComponent(album.genre)}`}
                  className="hover:text-acc hover:underline"
                >
                  {album.genre}
                </Link>
              </>
            )}
          </p>

          {/* 두 점수 (평점 ⟂ Elo, 별개 지표) */}
          <div className="mt-5 flex gap-8">
            <div>
              <p className="text-xs text-mut">평점 (내 점수)</p>
              <p
                className="text-2xl font-bold"
                style={album.manualRating != null ? { color: ratingColor(album.manualRating) } : undefined}
              >
                {album.manualRating ?? "–"}
                <span className="text-sm font-medium text-mut">/10</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-mut">Elo (취향 대결)</p>
              <p className="text-2xl font-bold">{album.eloRating}</p>
            </div>
          </div>

          <div className="mt-4">
            <AlbumPlayToolbar
              tracks={tracks}
              spotifyAlbumId={album.spotifyAlbumId}
              albumArtist={album.artist}
              albumCoverImageUrl={album.coverImageUrl}
              size="lg"
            />
          </div>
        </div>
      </div>

      {album.review && (
        <p className="mt-8 border-l-2 border-acc pl-4 text-mut">{album.review}</p>
      )}

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-mut">수록곡</h2>
          <div className="flex items-center gap-2">
            <LikeButton albumId={album.id} size="sm" />
            <ShareStoryButton album={album} tracks={tracks} size="sm" />
          </div>
        </div>
        {hasPreview && (
          <div className="mb-2 text-[10px] text-mut">
            <p>미리듣기 제공: Deezer</p>
            <p>미리듣기 음원은 자동 매칭이라 실제 음원과 다를 수 있습니다.</p>
          </div>
        )}

        <TrackList tracks={tracks} albumArtist={album.artist} albumCoverImageUrl={album.coverImageUrl} />

        {(totalMs > 0 || album.releaseDate || album.reviewDate) && (
          <p className="mt-4 text-xs text-mut">
            {tracks.length}곡
            {totalMs > 0 && ` · ${formatDuration(totalMs)}`}
            {album.releaseDate && ` · ${album.releaseDate} 발매`}
            {album.reviewDate && ` · ${album.reviewDate} 리뷰`}
          </p>
        )}
        {album.spotifyAlbumId && REAL_SPOTIFY_ID.test(album.spotifyAlbumId) && (
          <p className="mt-1 text-[10px] text-mut">앨범 정보 및 커버 이미지 제공: Spotify</p>
        )}
      </section>

      <AlbumComments albumId={album.id} />
    </div>
  );
}
