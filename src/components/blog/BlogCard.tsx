import Image from 'next/image';
import Link from 'next/link';
import { Post } from '@/lib/blog';
import { format } from 'date-fns';

type BlogCardProps = {
    post: Post;
};

export default function BlogCard({ post }: BlogCardProps) {
    return (
        <Link href={`/blog/${post.slug}`} className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 glass">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                <Image
                    src={post.frontmatter.coverImage}
                    alt={post.frontmatter.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </div>
            <div className="mt-4 flex flex-1 flex-col">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(post.frontmatter.date), 'MMMM d, yyyy')}</span>
                    <span>•</span>
                    <div className="flex gap-1">
                        {post.frontmatter.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                {tag}
                            </span>
                        ))}
                        {post.frontmatter.tags.length > 2 && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                                +{post.frontmatter.tags.length - 2}
                            </span>
                        )}
                    </div>
                </div>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                    {post.frontmatter.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {post.frontmatter.excerpt}
                </p>
            </div>
        </Link>
    );
}
