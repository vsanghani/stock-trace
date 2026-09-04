import type { Metadata } from "next"

/** Public product name — use everywhere user-facing branding appears */
export const SITE_NAME = "Plutox"

export const SITE_DESCRIPTION =
    "Real-time stock research and analysis: live quotes, sentiment, options, and portfolio tools."

export const SITE_TAGLINE =
    "Global market analysis for NYSE, NASDAQ, ASX, HKEX, JPX, LSE."

function siteUrl(): URL {
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
        },
        twitter: {
            card: "summary_large_image",
            title: SITE_NAME,
            description: SITE_DESCRIPTION,
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
