import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/blog"
import { MDXRemote } from "next-mdx-remote/rsc"
import { format } from "date-fns"
import { ArrowLeft, Clock } from "lucide-react"
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
                modifiedTime: post.frontmatter.updated ?? post.frontmatter.date,
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

    const relatedPosts = getAllPosts()
        .filter((candidate) =>
            candidate.slug !== post.slug &&
            candidate.frontmatter.tags.some((tag) => post.frontmatter.tags.includes(tag))
        )
        .slice(0, 3)
    const publishedDate = new Date(`${post.frontmatter.date}T12:00:00`)
    const articleUrl = new URL(`/blog/${post.slug}`, siteUrl()).toString()
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.frontmatter.title,
        description: post.frontmatter.excerpt,
        image: post.frontmatter.coverImage,
        datePublished: post.frontmatter.date,
        dateModified: post.frontmatter.updated ?? post.frontmatter.date,
        author: {
            "@type": "Organization",
            name: SITE_NAME,
        },
        publisher: {
            "@type": "Organization",
            name: SITE_NAME,
        },
        mainEntityOfPage: articleUrl,
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
                href="/blog"
                className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft size={16} />
                Back to Blog
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
