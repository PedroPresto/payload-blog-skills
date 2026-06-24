import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Cloudinary already delivers optimized images via its CDN.
    // Server-side Sharp processing wastes CPU/memory on shared hosts (causes 503s on Hostinger).
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default withPayload(nextConfig);
