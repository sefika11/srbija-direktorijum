import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // a second dev server in the same checkout sets NEXT_DIST_DIR so the two never share a build cache
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  experimental: { optimizePackageImports: [] },
};

export default nextConfig;
