import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vl.imgix.net",
      },
    ],
  },
};

export default nextConfig;
