import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow the landing page to call the dashboard API cross-origin during dev
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [],
      },
    ];
  },
};

export default nextConfig;
