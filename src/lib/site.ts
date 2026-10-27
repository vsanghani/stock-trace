import type { Metadata } from "next"

/** Public product name — use everywhere user-facing branding appears */
export const SITE_NAME = "Plutox"

export const SITE_DESCRIPTION =
    "Track listed stocks in one workspace. Latest quotes today; deeper analysis and recommendations are on the way."

/** Homepage document title. Absolute so the root template does not double the brand. */
export const LANDING_TITLE = `${SITE_NAME} — Track stocks in one workspace`

export const LANDING_DESCRIPTION =
    "Look up the latest price and company stats for a listed stock. Deeper analysis and recommendations are on the way. For information only, not financial advice."

/** Shown in the footer and repeated beside the landing page's final call to action. */
export const SITE_DISCLAIMER =
    `${SITE_NAME} is for information only and is not financial advice. Nothing on this site is a recommendation to buy, sell or hold any security. Market data may be delayed or incomplete.`

const SOCIAL_IMAGE = {
    url: "/og.png",
    width: 1200,
    height: 630,
    alt: `${LANDING_TITLE}. Latest quotes today. Deeper analysis on the way. For information only, not financial advice.`,
} as const

export const SITE_TAGLINE =
    "Global market analysis for NYSE, NASDAQ, ASX, HKEX, JPX, LSE."

export const COMPANY_NAME = "Vrtx Labs"
export const COMPANY_URL = "https://www.vrtxlabs.tech"

export function siteUrl(): URL {
    const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    try {
        return new URL(raw || "http://localhost:3000")
    } catch {
        return new URL("http://localhost:3000")
    }
}

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
            url: url.toString(),
            images: [SOCIAL_IMAGE],
        },
        twitter: {
            card: "summary_large_image",
            title: SITE_NAME,
            description: SITE_DESCRIPTION,
            images: [SOCIAL_IMAGE.url],
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
            images: [SOCIAL_IMAGE.url],
        },
    }
}

/** Per-route metadata (title is combined with the root template) */
export function pageMetadata(title: string, description?: string): Metadata {
    return {
        title,
        ...(description ? { description } : {}),
    }
}

/** Same as `pageMetadata`, plus `noindex, nofollow` for signed-in and account screens. */
export function privatePageMetadata(title: string, description?: string): Metadata {
    return {
        ...pageMetadata(title, description),
        robots: privateRobots,
    }
}
