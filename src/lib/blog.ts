import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'src/content/posts');

export type Post = {
    slug: string;
    frontmatter: {
        title: string;
        date: string;
        excerpt: string;
        coverImage: string;
        tags: string[];
        [key: string]: any;
    };
    content: string;
};

export function getPostSlugs() {
    if (!fs.existsSync(postsDirectory)) {
        return [];
    }
    return fs.readdirSync(postsDirectory);
}

export function getPostBySlug(slug: string): Post {
    const realSlug = slug.replace(/\.mdx$/, '');
    const fullPath = path.join(postsDirectory, `${realSlug}.mdx`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    if (!data.tags || !Array.isArray(data.tags)) {
        throw new Error(`Post ${realSlug} is missing tags. Must have at least 1 tag.`);
    }

    if (data.tags.length < 1) {
        throw new Error(`Post ${realSlug} must have at least 1 tag.`);
    }

    if (data.tags.length > 5) {
        throw new Error(`Post ${realSlug} cannot have more than 5 tags.`);
    }

    return {
        slug: realSlug,
        frontmatter: data as Post['frontmatter'],
        content,
    };
}

export function getAllPosts(): Post[] {
    const slugs = getPostSlugs();
    const posts = slugs
        .map((slug) => getPostBySlug(slug))
        // Sort posts by date in descending order
        .sort((post1, post2) => (post1.frontmatter.date > post2.frontmatter.date ? -1 : 1));
    return posts;
}

export function getAllTags(): string[] {
    const posts = getAllPosts();
    const tags = new Set<string>();
    posts.forEach((post) => {
        if (post.frontmatter.tags) {
            post.frontmatter.tags.forEach((tag) => tags.add(tag));
        }
    });
    return Array.from(tags).sort();
}
