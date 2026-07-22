import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 홈 디렉토리의 stray lockfile로 워크스페이스 루트가 잘못 추론되는 경고 방지
  turbopack: {
    root: path.resolve(__dirname),
  },
  // 좌측 하단 개발 모드 인디케이터(N 아이콘) 숨김 — 에러/컴파일 알림은 계속 표시됨
  devIndicators: false,
  // next/image로 최적화할 외부 이미지 호스트 — 앨범 커버(Spotify) + 목(mock) 데이터 플레이스홀더
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};

export default nextConfig;
