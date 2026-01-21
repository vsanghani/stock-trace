import { getAllPosts, getAllTags } from '@/lib/blog';
import BlogList from '@/components/blog/BlogList';

export const metadata = {
    title: 'Blog | Stock Trace',
    description: 'Insights and updates from the Stock Trace team.',
};

export default function BlogPage() {
    const posts = getAllPosts();
    const tags = getAllTags();

    return (
        <div className="container mx-auto px-4 py-12 md:py-20 lg:py-24">
            <div className="mb-12 max-w-2xl">
                <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
                    Our <span className="text-amber-400">Blog</span>
                </h1>
                <p className="mt-4 text-lg text-muted-foreground">
                    Latest news, updates, and technical deep dives from our team.
                </p>
            </div>

            <BlogList initialPosts={posts} allTags={tags} />
        </div>
    );
}
