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
    // Next 16부터 quality 값을 화이트리스트에 등록해야 함(기본은 75만 허용, 그 외 값은
    // 조용히 가장 가까운 허용값으로 대체됨). 40은 AlbumRatingCard의 블러 배경용 — 어차피
    // blur로 뭉개지는 이미지라 낮은 화질로도 티가 안 나 전송량을 더 줄일 수 있다.
    qualities: [40, 75],
  },
};

export default nextConfig;
