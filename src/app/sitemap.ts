import type { MetadataRoute } from "next"
import { getAllPosts } from "@/lib/blog"
import { siteUrl } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = siteUrl().origin
    const staticPages: MetadataRoute.Sitemap = [
        { url: baseUrl, changeFrequency: "daily", priority: 1 },
        { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.9 },
        { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${baseUrl}/company`, changeFrequency: "monthly", priority: 0.5 },
    ]

    const articles: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.frontmatter.updated ?? post.frontmatter.date),
        changeFrequency: "monthly",
        priority: 0.8,
    }))

    return [...staticPages, ...articles]
}
