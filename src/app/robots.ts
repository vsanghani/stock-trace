import type { MetadataRoute } from "next"
import { NON_INDEXABLE_PATHS, siteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
    const baseUrl = siteUrl().origin

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [...NON_INDEXABLE_PATHS],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
