import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 홈 디렉토리의 stray lockfile로 워크스페이스 루트가 잘못 추론되는 경고 방지
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
