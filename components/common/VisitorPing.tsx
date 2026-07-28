"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * 페이지 방문마다 조용히 기록(자체 방문자 카운터, 외부 서비스 없음) — 아무것도 렌더하지 않는
 * 순수 사이드이펙트 컴포넌트. app/layout.tsx에 항상 마운트돼 경로가 바뀔 때마다 재실행된다.
 * sendBeacon을 우선 쓰는 이유: 페이지 이탈 중에도 요청이 취소되지 않고 살아남기 때문.
 */
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
