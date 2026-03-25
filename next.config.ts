import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "rh-images.xiaoyaoyou.com" },
      { protocol: "https", hostname: "**.xiaoyaoyou.com" },
      { protocol: "https", hostname: "**.myqcloud.com" },
    ],
  },
};

export default nextConfig;
