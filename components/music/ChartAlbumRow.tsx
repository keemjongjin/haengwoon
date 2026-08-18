import Image from "next/image";
import Link from "next/link";
import { RatingRing } from "./RatingRing";

/** ChartAlbumRow에 넘기는 최소 데이터. rating은 호출부가 이미 평점/Elo 중 보여줄 값을 골라 넣는다. */
export type ChartRowAlbum = {
  id: number;
  spotifyAlbumId?: string | null;
  title: string;
  artist: string;
  coverImageUrl: string | null;
  rating: number | null;
};

/**
 * Charts 전용 한 줄 행 — 커버 + 제목/아티스트 + 우측 평점 배지.
 * AlbumRatingCard(프로스티드 글래스 배경 + FAVORITE SONG 섹션)는 Archive/Search/artist용으로
 * 그대로 두고, Charts는 순위 목록이라 정보 밀도를 낮춘 이 컴포넌트를 따로 쓴다 — 참고 이미지
 * 처럼 커버·이름만 훑고 우측 평점으로 바로 순위를 비교하는 용도.
 */
export function ChartAlbumRow({ album }: { album: ChartRowAlbum }) {
  const albumHref = `/music/album/${album.spotifyAlbumId ?? album.id}`;
  const artistHref = `/artist/${encodeURIComponent(album.artist)}`;

  return (
    // pr-*: 평점 링이 본문 오른쪽 끝에 딱 붙으면 화면 밖으로 밀려난 것처럼 보인다.
    // 순위 숫자가 왼쪽에서 들여쓰기된 만큼 오른쪽에도 여백을 줘 좌우 균형을 맞춘다.
    <div className="flex min-w-0 flex-1 items-center gap-3 pr-4 sm:pr-8">
      <Link href={albumHref} className="shrink-0">
        {album.coverImageUrl ? (
          <Image
            src={album.coverImageUrl}
            alt={album.title}
            width={56}
            height={56}
            className="h-14 w-14 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-card text-lg font-bold text-mut">
            {album.title.slice(0, 1)}
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={albumHref}>
          <h3 className="truncate font-semibold hover:text-acc">{album.title}</h3>
        </Link>
        <Link href={artistHref} className="block truncate text-sm text-mut hover:text-fg">
          {album.artist}
        </Link>
      </div>

      {/* 참고 이미지의 + 버튼 자리 — 평점으로 대체. Archive 카드와 같은 RatingRing을 그대로
          써서 점수만큼 링이 채워진다(같은 평점이 화면마다 다르게 보이면 안 된다). */}
      {album.rating != null && (
        <Link href={albumHref} className="shrink-0">
          <RatingRing value={album.rating} size={44} />
        </Link>
      )}
    </div>
  );
}
