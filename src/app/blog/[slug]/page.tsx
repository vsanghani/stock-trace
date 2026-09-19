import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getPostBySlug, getPostSlugs } from "@/lib/blog"
import { MDXRemote } from "next-mdx-remote/rsc"
import { format } from "date-fns"
import { ArrowLeft, Clock } from "lucide-react"
import { getPrimaryTopicForPost, getRelatedPosts } from "@/lib/blog-topics"
import { SITE_NAME, siteUrl } from "@/lib/site"

export async function generateStaticParams() {
    const posts = getPostSlugs();
    return posts.map((slug) => ({
        slug: slug.replace(/\.mdx$/, ''),
    }));
}

type Props = {
    params: Promise<{
        slug: string;
    }>;
};

export async function generateMetadata({ params }: Props) {
    const resolvedParams = await params;
    try {
        const post = getPostBySlug(resolvedParams.slug);
        const modifiedTime = [post.frontmatter.date, post.frontmatter.updated, post.frontmatter.reviewed]
            .filter((value): value is string => Boolean(value))
            .sort()
            .at(-1)
        return {
            title: post.frontmatter.title,
            description: post.frontmatter.excerpt,
            keywords: post.frontmatter.keywords,
            alternates: {
                canonical: `/blog/${post.slug}`,
            },
            openGraph: {
                type: "article",
                title: post.frontmatter.title,
                description: post.frontmatter.excerpt,
                url: `/blog/${post.slug}`,
                publishedTime: post.frontmatter.date,
                modifiedTime,
                images: [{ url: post.frontmatter.coverImage }],
                tags: post.frontmatter.tags,
            },
        }
    } catch {
        return {
            title: "Blog Post Not Found",
            description: `${SITE_NAME} blog article.`,
        }
    }
}

export default async function BlogPost({ params }: Props) {
    const resolvedParams = await params;
    let post;
    try {
        post = getPostBySlug(resolvedParams.slug);
    } catch {
        notFound();
    }

    const relatedPosts = getRelatedPosts(post)
    const topic = getPrimaryTopicForPost(post)
    const publishedDate = new Date(`${post.frontmatter.date}T12:00:00`)
    const reviewedDate = post.frontmatter.reviewed
        ? new Date(`${post.frontmatter.reviewed}T12:00:00`)
        : null
    const modifiedDate = [post.frontmatter.date, post.frontmatter.updated, post.frontmatter.reviewed]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1)
    const articleUrl = new URL(`/blog/${post.slug}`, siteUrl()).toString()
    const blogUrl = new URL("/blog", siteUrl()).toString()
    const topicUrl = topic
        ? new URL(`/blog/topics/${topic.slug}`, siteUrl()).toString()
        : undefined
    const breadcrumbItems = [
        {
            "@type": "ListItem",
            position: 1,
            name: "Blog",
            item: blogUrl,
        },
        ...(topic && topicUrl
            ? [{
                "@type": "ListItem",
                position: 2,
                name: topic.title,
                item: topicUrl,
            }]
            : []),
        {
            "@type": "ListItem",
            position: topic ? 3 : 2,
            name: post.frontmatter.title,
            item: articleUrl,
        },
    ]
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                headline: post.frontmatter.title,
                description: post.frontmatter.excerpt,
                image: post.frontmatter.coverImage,
                datePublished: post.frontmatter.date,
                dateModified: modifiedDate ?? post.frontmatter.date,
                author: {
                    "@type": "Organization",
                    name: SITE_NAME,
                },
                publisher: {
                    "@type": "Organization",
                    name: SITE_NAME,
                },
                mainEntityOfPage: articleUrl,
                ...(topicUrl ? { articleSection: topic?.title } : {}),
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: breadcrumbItems,
            },
        ],
    }

    return (
        <article className="container mx-auto px-4 py-12 md:py-20">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
                }}
            />
            <Link
                href={topic ? `/blog/topics/${topic.slug}` : "/blog"}
                className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft size={16} />
                {topic ? `Back to ${topic.title}` : "Back to Blog"}
            </Link>

            <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-xl border border-border shadow-2xl">
                <Image
                    src={post.frontmatter.coverImage}
                    alt={post.frontmatter.title}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 md:p-10">
                    <div className="mb-4 flex flex-wrap gap-2">
                        {post.frontmatter.tags.map((tag: string) => (
                            <span
                                key={tag}
                                className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400 backdrop-blur-md"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
                        {post.frontmatter.title}
                    </h1>
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-300">
                        <span>{format(publishedDate, 'MMMM d, yyyy')}</span>
                        {reviewedDate && (
                            <>
                                <span aria-hidden="true">•</span>
                                <span>Reviewed {format(reviewedDate, 'MMMM d, yyyy')}</span>
                            </>
                        )}
                        <span aria-hidden="true">•</span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock size={14} />
                            {post.readingTime} min read
                        </span>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl">
                <p className="mb-8 border-l-2 border-amber-500 pl-4 text-sm leading-6 text-muted-foreground">
                    Educational content only. This article does not constitute personalized
                    financial, investment, tax, or legal advice.
                </p>
                <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-amber-700 dark:prose-a:text-amber-400 prose-img:rounded-xl">
                    <MDXRemote source={post.content} />
                </div>

                {post.frontmatter.sources && post.frontmatter.sources.length > 0 && (
                    <section className="mt-12 border-t border-border pt-8">
                        <h2 className="text-xl font-bold tracking-tight">Sources and further reading</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Primary references for definitions, filings, and investor education. These
                            links are not an endorsement of any security or strategy.
                        </p>
                        <ul className="mt-4 space-y-2">
                            {post.frontmatter.sources.map((source) => (
                                <li key={source.url}>
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-amber-800 underline-offset-4 hover:underline dark:text-amber-400"
                                    >
                                        {source.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {relatedPosts.length > 0 && (
                    <aside className="mt-16 border-t border-border pt-10">
                        <h2 className="text-2xl font-bold tracking-tight">Continue learning</h2>
                        <div className="mt-5 grid gap-4 sm:grid-cols-3">
                            {relatedPosts.map((related) => (
                                <Link
                                    key={related.slug}
                                    href={`/blog/${related.slug}`}
                                    className="rounded-xl border border-border bg-background/70 p-4 transition-colors hover:border-amber-600/50"
                                >
                                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                                        {related.readingTime} min read
                                    </span>
                                    <h3 className="mt-2 font-semibold leading-snug">{related.frontmatter.title}</h3>
                                </Link>
                            ))}
                        </div>
                    </aside>
                )}
            </div>
        </article>
    );
}
