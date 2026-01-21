'use client';

import { useState } from 'react';
import { Post } from '@/lib/blog';
import BlogCard from './BlogCard';
import TagFilter from './TagFilter';
import SearchInput from './SearchInput';
import { AnimatePresence, motion } from 'framer-motion';

type BlogListProps = {
    initialPosts: Post[];
    allTags: string[];
};

export default function BlogList({ initialPosts, allTags }: BlogListProps) {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const filteredPosts = initialPosts.filter((post) => {
        // 1. Tag Filter Logic (AND logic)
        const matchesTags =
            selectedTags.length === 0 ||
            selectedTags.every((tag) => post.frontmatter.tags.includes(tag));

        // 2. Search Query Logic
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            searchQuery === '' ||
            post.frontmatter.title.toLowerCase().includes(query) ||
            post.frontmatter.excerpt.toLowerCase().includes(query) ||
            post.frontmatter.tags.some((tag) => tag.toLowerCase().includes(query));

        return matchesTags && matchesSearch;
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Search Article
                    </h2>
                    <SearchInput value={searchQuery} onChange={setSearchQuery} />
                </div>

                <div>
                    <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Filter by Topic
                    </h2>
                    <TagFilter
                        tags={allTags}
                        selectedTags={selectedTags}
                        onToggleTag={toggleTag}
                    />
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                    {filteredPosts.map((post) => (
                        <motion.div
                            key={post.slug}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                        >
                            <BlogCard post={post} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredPosts.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-muted-foreground">No posts found matching your criteria.</p>
                    <button
                        onClick={() => {
                            setSelectedTags([]);
                            setSearchQuery('');
                        }}
                        className="mt-4 text-sm text-amber-400 hover:underline"
                    >
                        Clear filters
                    </button>
                </div>
            )}
        </div>
    );
}
