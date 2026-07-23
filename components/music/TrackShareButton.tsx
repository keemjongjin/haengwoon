"use client";

import { ShareCard, type ShareSubject } from "./ShareCard";

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
