"use client";

// 앨범 상세 페이지의 "앨범 공유" 버튼. 트랙 목록에서 최애곡을 찾아 ShareCard에 전달만 하고,
// 실제 카드 렌더링·PNG 생성은 전부 ShareCard가 담당한다(이 파일은 데이터 조립까지만).
import { ShareCard, type ShareSubject } from "./ShareCard";

type Track = {
  id: number;
  title: string;
  trackNumber: number;
  isFavorite: boolean;
  manualRating: number | null;
};

/** 앨범 + 수록곡 목록을 받아 최애곡을 찾고 ShareCard용 ShareSubject(typeLabel: "Album")로 변환. */
export function ShareStoryButton({
  album,
  tracks,
  size = "lg",
}: {
  album: {
    id: number;
    title: string;
    artist: string;
    albumType?: string | null;
    coverImageUrl: string | null;
    manualRating: number | null;
    review?: string | null;
  };
  tracks: Track[];
  size?: "sm" | "lg";
}) {
  const favorite = tracks.find((t) => t.isFavorite);

  const subject: ShareSubject = {
    typeLabel: "Album",
    title: album.title,
    artist: album.artist,
    coverImageUrl: album.coverImageUrl,
    manualRating: album.manualRating,
    comment: album.review,
    favorite: favorite ? { title: favorite.title, tier: favorite.manualRating } : null,
    filenameBase: album.title,
    colorSeed: album.id,
  };

  return <ShareCard subject={subject} triggerSize={size} />;
}
