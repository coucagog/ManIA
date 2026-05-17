import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Disable the new dev overlay introduced in Next.js 15.2
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
