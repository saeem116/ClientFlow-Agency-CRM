import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Allow the next/image internal optimizer to fetch from the avatar
  // endpoint without requiring a session cookie. The endpoint is keyed by
  // userId (not by the raw GridFS id), so leaking the url is harmless —
  // the server still enforces membership checks at the image-serving layer.
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/avatars/**",
      },
      {
        protocol: "https",
        hostname: "**",
        pathname: "/api/avatars/**",
      },
    ],
  },
};

export default nextConfig;
