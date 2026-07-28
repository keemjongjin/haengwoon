"use client";

// 트랙리스트 각 곡의 "더보기" 메뉴에서 쓰는 곡 단위 공유 버튼. ShareStoryButton(앨범용)과 짝을
// 이루는 곡 버전 — 마찬가지로 데이터만 조립해 ShareCard에 넘긴다.
import { ShareCard, type ShareSubject } from "./ShareCard";

/** 트랙 하나를 ShareCard용 ShareSubject(typeLabel: "Song")로 변환. */
export function TrackShareButton({
  track,
  albumArtist,
  albumCoverImageUrl,
}: {
  track: {
    id: number;
    title: string;
    manualRating: number | null;
    isFavorite: boolean;
    comment: string | null;
  };
  albumArtist: string;
  albumCoverImageUrl: string | null;
}) {
  const subject: ShareSubject = {
    typeLabel: "Song",
    title: track.title,
    artist: albumArtist,
    coverImageUrl: albumCoverImageUrl,
    manualRating: null,
    trackTier: { tier: track.manualRating, isFavorite: track.isFavorite },
    comment: track.comment,
    filenameBase: track.title,
    colorSeed: track.id,
  };

  return <ShareCard subject={subject} triggerSize="sm" />;
}
