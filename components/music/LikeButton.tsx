"use client";

import { useEffect, useState } from "react";

export function LikeButton({ albumId }: { albumId: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch(`/api/likes?targetType=album&targetId=${albumId}`)
      .then((r) => r.json())
      .then((d) => setCount(d.count));
  }, [albumId]);

  async function like() {
    setCount((c) => c + 1); // 낙관적
    const res = await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "album", targetId: albumId }),
    });
    const data = await res.json().catch(() => null);
    if (data?.count != null) setCount(data.count);
  }

  return (
    <button
      onClick={like}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm hover:border-acc"
    >
      <span>❤️</span>
      <span className="font-medium">{count}</span>
    </button>
  );
}
