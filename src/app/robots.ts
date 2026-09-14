import type { MetadataRoute } from "next"
import { siteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
    const baseUrl = siteUrl().origin

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/dashboard/"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
