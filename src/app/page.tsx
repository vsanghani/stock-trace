import { redirect } from "next/navigation"
import { HomePage } from "@/components/landing/home-page"
import { LANDING_DESCRIPTION, landingMetadata, SITE_NAME, siteUrl } from "@/lib/site"

export const metadata = landingMetadata()

export default async function LandingPage({
    searchParams,
}: {
    searchParams: Promise<{ ticker?: string }>
}) {
    // The research view used to live here as `/?ticker=`; keep those links working.
    const { ticker } = await searchParams
    if (ticker) {
        redirect(`/dashboard?ticker=${encodeURIComponent(ticker)}`)
    }

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
