"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// 페이지 방문마다 조용히 기록 (자체 방문자 카운터, 외부 서비스 없음).
export function VisitorPing() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return; // 관리자 방문은 집계 제외
    const body = JSON.stringify({ path: pathname });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    }
  }, [pathname]);

  return null;
}
