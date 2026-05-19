import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      // Serve runtime-uploaded files via API (Next.js doesn't re-scan public/ at runtime)
      { source: '/uploads/:path*', destination: '/api/files/:path*' },
    ]
  },
};

export default nextConfig;
