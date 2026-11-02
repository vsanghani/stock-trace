import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` talks to Postgres over Node sockets and must not be bundled.
  serverExternalPackages: ["pg"],
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
