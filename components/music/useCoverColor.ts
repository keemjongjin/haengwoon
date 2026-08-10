"use client";

import { useEffect, useState } from "react";
import { coverColor, type CoverColor } from "@/lib/media/coverColor";

/**
 * 앨범 커버에서 뽑은 대표색을 구독한다. 아직 못 뽑았거나 실패하면 null —
 * 호출측은 그동안 기존 기본색으로 그리면 된다(색이 늦게 도착해도 레이아웃은 그대로).
 *
 * 결과를 URL과 함께 들고 있다가 지금 요청한 URL과 일치할 때만 돌려준다.
 * 캐러셀에서 카드가 재사용될 때 직전 앨범의 색이 잠깐 비치는 걸 막기 위해서다.
 */
export function useCoverColor(url: string | null): CoverColor | null {
  const [resolved, setResolved] = useState<{ url: string; color: CoverColor } | null>(null);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    coverColor(url).then((color) => {
      if (alive && color) setResolved({ url, color });
    });
    return () => {
      alive = false;
    };
  }, [url]);

  return resolved && resolved.url === url ? resolved.color : null;
}
