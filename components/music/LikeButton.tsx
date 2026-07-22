"use client";

import { useEffect, useState } from "react";

export function LikeButton({
  albumId,
  size = "lg",
  variant = "pill",
  className = "",
}: {
  albumId: number;
  size?: "sm" | "lg";
  variant?: "pill" | "minimal";
  className?: string;
}) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetch(`/api/likes?targetType=album&targetId=${albumId}`)
      .then((r) => r.json())
      .then((d) => {
        setCount(d.count);
        setLiked(Boolean(d.liked));
      });
  }, [albumId]);

  // IP 기준 토글 — 이미 눌렀으면 취소, 아니면 추가 (계정 없이도 같은 IP 판별로 가능)
  async function toggle() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1)); // 낙관적
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "album", targetId: albumId }),
      });
      const data = await res.json().catch(() => null);
      if (data?.count != null) setCount(data.count);
      if (data?.liked != null) setLiked(data.liked);
    } catch {
      setLiked(!next);
      setCount((c) => c - (next ? 1 : -1)); // 실패 시 낙관적 업데이트 롤백
    }
  }

  // 인스타그램 좋아요 UI 느낌 — 테두리/배경 없이 하트 아이콘 + 개수만. 카드 안 코멘트 줄 옆에 붙는 용도.
  if (variant === "minimal") {
    return (
      <button
        onClick={toggle}
        aria-pressed={liked}
        aria-label={liked ? "좋아요 취소" : "좋아요"}
        className={
          "inline-flex shrink-0 items-center gap-1 text-xs transition-colors " +
          (liked ? "text-red-500" : className || "text-mut hover:text-red-400")
        }
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="font-medium">{count}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "좋아요 취소" : "좋아요"}
      className={
        "inline-flex items-center gap-1.5 rounded-full border transition-colors " +
        (size === "lg" ? "px-4 py-2 text-sm" : "px-3.5 py-1.5 text-xs") +
        " " +
        (liked ? "border-red-500/40 text-red-500" : "border-line text-mut hover:border-red-400 hover:text-red-400")
      }
    >
      <svg
        width={size === "lg" ? 18 : 15}
        height={size === "lg" ? 18 : 15}
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="font-medium">{count}</span>
    </button>
  );
}
