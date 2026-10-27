import { HomePage } from "@/components/landing/home-page"
import { LANDING_DESCRIPTION, landingMetadata, SITE_NAME, siteUrl } from "@/lib/site"

export const metadata = landingMetadata()

/**
 * Statically prerendered. Legacy `/?ticker=` links are redirected in `src/proxy.ts`
 * so this page does not read search params and can be emitted as HTML at build time.
 */
export default function LandingPage() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        description: LANDING_DESCRIPTION,
        url: siteUrl().origin,
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
