import type { NextConfig } from "next";
import { warnMissingEnv } from "./src/lib/env";

warnMissingEnv();

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

};

export default nextConfig;
