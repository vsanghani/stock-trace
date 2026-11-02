import { inspectEnv, type AppEnv } from "@/lib/env"

/**
 * Server and proxy environment. Every key is read with a static
 * `process.env.NAME` access so the Next.js edge bundle includes it.
 * Do not import this module from a client component.
 */
export function getServerEnv(source?: Record<string, string | undefined>): AppEnv {
    if (source) return inspectEnv(source).env
    return inspectEnv({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
        DATABASE_URL: process.env.DATABASE_URL,
        SEC_USER_AGENT: process.env.SEC_USER_AGENT,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
        FMP_API_KEY: process.env.FMP_API_KEY,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
        NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
        NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
        NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
        SENTRY_DSN: process.env.SENTRY_DSN,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
        SENTRY_ORG: process.env.SENTRY_ORG,
        SENTRY_PROJECT: process.env.SENTRY_PROJECT,
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
        NEXT_RUNTIME: process.env.NEXT_RUNTIME,
    }).env
}
