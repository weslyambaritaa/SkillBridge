import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 5 MiB files plus multipart framing; the action still enforces 5 MiB per file.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
