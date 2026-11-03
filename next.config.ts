import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // API 라우트가 채점할 때 학습지 JSON을 읽을 수 있게 배포 묶음에 넣는다
  outputFileTracingIncludes: {
    "/api/**": ["./content/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
