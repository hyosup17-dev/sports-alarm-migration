import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // ★ 이 줄을 꼭 추가해야 합니다!
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
