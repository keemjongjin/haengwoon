"use client";

import { ShareCard, type ShareSubject } from "./ShareCard";

type Track = {
  id: number;
  title: string;
  trackNumber: number;
  isFavorite: boolean;
  manualRating: number | null;
};

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
