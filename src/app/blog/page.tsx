import { getAllPosts, getAllTags } from "@/lib/blog"
import BlogList from "@/components/blog/BlogList"
import TopicCard from "@/components/blog/TopicCard"
import { BLOG_TOPICS, getPostsForTopic } from "@/lib/blog-topics"
import { pageMetadata, SITE_NAME } from "@/lib/site"

export const metadata = pageMetadata(
    "Investing Guides & Market Education",
    `Learn how stocks, options, valuation, and financial markets work with clear, practical guides from ${SITE_NAME}.`
)

export default function BlogPage() {
    const posts = getAllPosts()
    const tags = getAllTags()

    return (
        <div className="container mx-auto px-4 py-12 md:py-20 lg:py-24">
            <div className="mb-12 max-w-3xl">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                    Learn investing
                </p>
                <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
                    Understand the market,{" "}
                    <span className="text-amber-700 dark:text-amber-400">one concept at a time</span>
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                    Plain-English guides to stocks, options, company valuation, and the
                    financial terms every investor should know.
                </p>
            </div>

            <section className="mb-16" aria-labelledby="browse-topics">
                <div className="mb-6">
                    <p className="text-sm font-medium text-muted-foreground">Structured learning paths</p>
                    <h2 id="browse-topics" className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                        Browse by topic
                    </h2>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {BLOG_TOPICS.map((topic) => (
                        <TopicCard
                            key={topic.slug}
                            topic={topic}
                            articleCount={getPostsForTopic(topic, posts).length}
                        />
                    ))}
                </div>
            </section>

            <div className="mb-6">
                <p className="text-sm font-medium text-muted-foreground">Complete library</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                    All investing guides
                </h2>
            </div>
            <BlogList initialPosts={posts} allTags={tags} />
        </div>
    )
}
