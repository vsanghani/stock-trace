import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { getPostBySlug, getPostSlugs } from "@/lib/blog"
import { MDXRemote } from "next-mdx-remote/rsc"
import { format } from "date-fns"
import { ArrowLeft } from "lucide-react"
import { SITE_NAME } from "@/lib/site"

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
    } catch (e) {
        notFound();
    }

    return (
        <article className="container mx-auto px-4 py-12 md:py-20">
            <Link
                href="/blog"
                className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
            >
                <ArrowLeft size={16} />
                Back to Blog
            </Link>

            <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-xl border border-white/10 shadow-2xl">
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
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-300">
                        <span>{format(new Date(post.frontmatter.date), 'MMMM d, yyyy')}</span>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-4xl">
                <div className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-amber-400 prose-img:rounded-xl">
                    <MDXRemote source={post.content} />
                </div>
            </div>
        </article>
    );
}
