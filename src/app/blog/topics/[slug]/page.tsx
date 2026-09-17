import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight } from "lucide-react"
import BlogCard from "@/components/blog/BlogCard"
import {
    BLOG_TOPICS,
    getBlogTopic,
    getPostsForTopic,
} from "@/lib/blog-topics"
import { SITE_NAME, siteUrl } from "@/lib/site"

type Props = {
    params: Promise<{
        slug: string
    }>
}

export function generateStaticParams() {
    return BLOG_TOPICS.map((topic) => ({ slug: topic.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const topic = getBlogTopic(slug)

    if (!topic) {
        return {
            title: "Topic Not Found",
            description: `${SITE_NAME} investing education topic.`,
        }
    }

    return {
        title: `${topic.title} Guides`,
        description: topic.description,
        keywords: topic.keywords,
        alternates: {
            canonical: `/blog/topics/${topic.slug}`,
        },
        openGraph: {
            type: "website",
            title: `${topic.title} Guides`,
            description: topic.description,
            url: `/blog/topics/${topic.slug}`,
        },
    }
}

export default async function TopicHubPage({ params }: Props) {
    const { slug } = await params
    const topic = getBlogTopic(slug)

    if (!topic) {
        notFound()
    }

    const posts = getPostsForTopic(topic)
    const topicUrl = new URL(`/blog/topics/${topic.slug}`, siteUrl()).toString()
    const blogUrl = new URL("/blog", siteUrl()).toString()
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                name: `${topic.title} Guides`,
                description: topic.description,
                url: topicUrl,
                isPartOf: {
                    "@type": "Blog",
                    name: `${SITE_NAME} Blog`,
                    url: blogUrl,
                },
                mainEntity: {
                    "@type": "ItemList",
                    numberOfItems: posts.length,
                    itemListElement: posts.map((post, index) => ({
                        "@type": "ListItem",
                        position: index + 1,
                        name: post.frontmatter.title,
                        url: new URL(`/blog/${post.slug}`, siteUrl()).toString(),
                    })),
                },
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "Blog",
                        item: blogUrl,
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: topic.title,
                        item: topicUrl,
                    },
                ],
            },
        ],
    }

    return (
        <main className="container mx-auto px-4 py-12 md:py-20 lg:py-24">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
                }}
            />

            <nav aria-label="Breadcrumb">
                <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft size={16} aria-hidden="true" />
                    All investing guides
                </Link>
            </nav>

            <header className="mt-10 max-w-4xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                    {topic.eyebrow}
                </p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                    {topic.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
                    {topic.description}
                </p>
                <p className="mt-4 text-sm font-medium text-muted-foreground">
                    {posts.length} {posts.length === 1 ? "guide" : "guides"} in this topic
                </p>
            </header>

            {topic.tool && (
                <section className="mt-10 rounded-2xl border border-amber-600/30 bg-amber-500/5 p-6 md:flex md:items-center md:justify-between md:gap-8">
                    <div>
                        <h2 className="text-lg font-bold">{topic.tool.label}</h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {topic.tool.description}
                        </p>
                    </div>
                    <Link
                        href={topic.tool.href}
                        className="mt-5 inline-flex shrink-0 items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 md:mt-0"
                    >
                        Try the tool
                        <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                </section>
            )}

            <section className="mt-14" aria-labelledby="topic-guides">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Learning library</p>
                        <h2 id="topic-guides" className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                            Guides in {topic.title}
                        </h2>
                    </div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.map((post) => (
                        <BlogCard key={post.slug} post={post} />
                    ))}
                </div>
            </section>
        </main>
    )
}
