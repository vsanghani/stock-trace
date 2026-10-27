import { HomePage } from "@/components/landing/home-page"
import { LANDING_DESCRIPTION, landingMetadata, SITE_NAME, siteUrl } from "@/lib/site"

export const metadata = landingMetadata()

/**
 * Statically prerendered. Legacy `/?ticker=` links are redirected in `src/proxy.ts`
 * so this page does not read search params and can be emitted as HTML at build time.
 */
export default function LandingPage() {
    const origin = siteUrl().origin
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${origin}/#organization`,
                name: SITE_NAME,
                url: origin,
                logo: new URL("/apple-icon.png", origin).href,
            },
            {
                "@type": "WebSite",
                name: SITE_NAME,
                description: LANDING_DESCRIPTION,
                url: origin,
                publisher: { "@id": `${origin}/#organization` },
            },
        ],
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
                }}
            />
            <HomePage />
        </>
    )
}
