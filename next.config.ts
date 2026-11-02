import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

import { inspectEnv, readPublicEnv, shouldUploadSourceMaps, warnMissingEnv } from "./src/lib/env";
import { securityHeaders } from "./src/lib/security-headers";

warnMissingEnv();

// Node loads this file, so a dynamic `process.env` read sees every variable.
const serverEnv = inspectEnv().env;
const uploadSourceMaps = shouldUploadSourceMaps(serverEnv);
const sentryEnabled = Boolean(serverEnv.SENTRY_DSN || readPublicEnv().NEXT_PUBLIC_SENTRY_DSN || uploadSourceMaps);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
};

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: serverEnv.SENTRY_ORG,
      project: serverEnv.SENTRY_PROJECT,
      authToken: serverEnv.SENTRY_AUTH_TOKEN,
      silent: !uploadSourceMaps,
      telemetry: false,
      sourcemaps: {
        disable: !uploadSourceMaps,
      },
      release: {
        create: uploadSourceMaps,
      },
    })
  : nextConfig;
