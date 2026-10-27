import type { Metadata } from "next"

/** Public product name — use everywhere user-facing branding appears */
export const SITE_NAME = "Plutox"

export const SITE_DESCRIPTION =
    "Track stocks in one workspace: look up the latest price and company stats for a listed stock. For information only, not financial advice."

/** Homepage document title. Absolute so the root template does not double the brand. */
export const LANDING_TITLE = `${SITE_NAME} — Track stocks in one workspace`

export const LANDING_DESCRIPTION = SITE_DESCRIPTION

/** Shown in the footer and repeated beside the landing page's final call to action. */
export const SITE_DISCLAIMER =
    `${SITE_NAME} is for information only and is not financial advice. Nothing on this site is a recommendation to buy, sell or hold any security. Market data may be delayed or incomplete.`

const SOCIAL_IMAGE = {
    url: "/og.png",
    width: 1200,
    height: 630,
    alt: `${LANDING_TITLE}. Latest quotes today. For information only, not financial advice.`,
} as const

const TWITTER_IMAGE = {
    url: SOCIAL_IMAGE.url,
    alt: SOCIAL_IMAGE.alt,
} as const

const LOCAL_SITE_URL = "http://localhost:3000"
const PRODUCTION_SITE_URL = "https://www.plutox.site"

function stripTrailingSlash(value: string): string {
    return value.replace(/\/+$/, "")
}

/** Accept a full URL or a bare host. Reject anything that is not http(s). */
function absoluteHttpUrl(raw: string): string {
    const trimmed = raw.trim()
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    let url: URL
    try {
        url = new URL(withProtocol)
    } catch {
        throw new Error(`Invalid site URL "${trimmed}". Expected an http(s) URL or host.`)
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error(`Invalid site URL "${trimmed}". Expected an http(s) URL or host.`)
    }
    const path = url.pathname.replace(/\/+$/, "")
    return stripTrailingSlash(`${url.origin}${path}${url.search}${url.hash}`)
}

function configuredUrl(name: string): string | undefined {
    const raw = process.env[name]?.trim()
    if (!raw) return undefined
    return absoluteHttpUrl(raw)
}

/**
 * Public origin for canonical URLs, Open Graph, the sitemap, and JSON-LD.
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_SITE_URL
 * 2. https://www.plutox.site when VERCEL_ENV is "production"
 * 3. https://VERCEL_PROJECT_PRODUCTION_URL
 * 4. https://VERCEL_URL (preview deployments that have no production host)
 * 5. http://localhost:3000 when NODE_ENV is not production
 *
 * A local `next build` sets NODE_ENV=production and does not set Vercel
 * variables. That is a build, not a production runtime, so it uses localhost
 * and does not throw. A Vercel process with no resolvable host throws, and so
 * does a production runtime such as `next start` when nothing above is set.
 */
export function siteUrl(): URL {
    const explicit = configuredUrl("NEXT_PUBLIC_SITE_URL")
    if (explicit) return new URL(explicit)

    if (process.env.VERCEL_ENV === "production") {
        return new URL(PRODUCTION_SITE_URL)
    }

    const productionHost = configuredUrl("VERCEL_PROJECT_PRODUCTION_URL")
    if (productionHost) return new URL(productionHost)

    const previewHost = configuredUrl("VERCEL_URL")
    if (previewHost) return new URL(previewHost)

    if (process.env.NODE_ENV !== "production") {
        return new URL(LOCAL_SITE_URL)
    }

    const onVercel = process.env.VERCEL === "1"
    const building =
        process.env.NEXT_PHASE === "phase-production-build" ||
        process.env.NEXT_PRIVATE_BUILD_WORKER === "1" ||
        process.env.npm_lifecycle_event === "build"

    if (!onVercel && building) {
        return new URL(LOCAL_SITE_URL)
    }

    throw new Error(
        "Cannot resolve the public site URL. Set NEXT_PUBLIC_SITE_URL. On Vercel, production uses https://www.plutox.site when VERCEL_ENV is \"production\"; otherwise VERCEL_PROJECT_PRODUCTION_URL or VERCEL_URL must be set."
    )
}

export const SITE_TAGLINE =
    "Global market analysis for NYSE, NASDAQ, ASX, HKEX, JPX, LSE."

export const COMPANY_NAME = "Vrtx Labs"
export const COMPANY_URL = "https://www.vrtxlabs.tech"

/** Root metadata for `src/app/layout.tsx` */
export function rootMetadata(): Metadata {
    const url = siteUrl()
    return {
        metadataBase: url,
        title: {
            default: SITE_NAME,
            template: `%s | ${SITE_NAME}`,
        },
        description: SITE_DESCRIPTION,
        applicationName: SITE_NAME,
        openGraph: {
            type: "website",
            siteName: SITE_NAME,
            title: SITE_NAME,
            description: SITE_DESCRIPTION,
            images: [SOCIAL_IMAGE],
        },
        twitter: {
            card: "summary_large_image",
            title: SITE_NAME,
            description: SITE_DESCRIPTION,
            images: [TWITTER_IMAGE],
        },
    }
}

/**
 * Routes a crawler should not index: authenticated research tools, auth screens,
 * and API handlers. Public marketing, blog, and legal pages are not in this list.
 * Prefixes match the path and anything under it (`/dashboard` covers `/dashboard?ticker=`).
 */
export const NON_INDEXABLE_PATHS = [
    "/api/",
    "/dashboard",
    "/valuation",
    "/options",
    "/pnl-calculator",
    "/senlogic",
    "/correlation",
    "/stress-test",
    "/whisper-alerts",
    "/sign-in",
    "/sign-up",
] as const

const privateRobots: Metadata["robots"] = {
    index: false,
    follow: false,
}

/** Metadata for the public landing page at `/`. */
export function landingMetadata(): Metadata {
    return {
        title: { absolute: LANDING_TITLE },
        description: LANDING_DESCRIPTION,
        alternates: { canonical: "/" },
        robots: { index: true, follow: true },
        openGraph: {
            title: LANDING_TITLE,
            description: LANDING_DESCRIPTION,
            url: "/",
            images: [SOCIAL_IMAGE],
        },
        twitter: {
            card: "summary_large_image",
            title: LANDING_TITLE,
            description: LANDING_DESCRIPTION,
            images: [TWITTER_IMAGE],
        },
    }
}

/**
 * Per-route metadata. `path` is that page's pathname (`/about`), used as the
 * canonical URL and `og:url`. The root Open Graph object does not set `url`,
 * so a page that omits `path` does not inherit the homepage URL.
 */
export function pageMetadata(title: string, description?: string, path?: string): Metadata {
    return {
        title,
        ...(description ? { description } : {}),
        ...(path
            ? {
                  alternates: { canonical: path },
                  openGraph: {
                      url: path,
                      images: [SOCIAL_IMAGE],
                  },
              }
            : {}),
    }
}

/** Same as `pageMetadata`, plus `noindex, nofollow` for signed-in and account screens. */
export function privatePageMetadata(title: string, description?: string): Metadata {
    return {
        ...pageMetadata(title, description),
        robots: privateRobots,
    }
}
