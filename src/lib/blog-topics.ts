import { getAllPosts, type Post } from "@/lib/blog"

export type BlogTopic = {
    slug: string
    title: string
    eyebrow: string
    shortDescription: string
    description: string
    keywords: string[]
    matchTags: string[]
    matchCategories: string[]
    tool?: {
        href: string
        label: string
        description: string
    }
}

export const BLOG_TOPICS: BlogTopic[] = [
    {
        slug: "investing-basics",
        title: "Investing Basics",
        eyebrow: "Start here",
        shortDescription: "Build a foundation in stocks, bonds, ETFs, dividends, and how markets work.",
        description:
            "Learn the building blocks of investing in plain English. This collection covers the securities investors can own, how trades work, what moves markets, and the vocabulary needed to research with confidence.",
        keywords: [
            "investing basics",
            "investing for beginners",
            "how investing works",
            "stock market basics",
        ],
        matchTags: [
            "investing-basics",
            "beginners",
            "market-cap",
            "dividends",
            "bonds",
            "order-types",
            "bull-market",
            "bear-market",
        ],
        matchCategories: ["Investing Basics", "Market Basics"],
    },
    {
        slug: "stock-analysis",
        title: "Stock Analysis",
        eyebrow: "Research companies",
        shortDescription: "Read financial statements, evaluate earnings, and estimate what a stock may be worth.",
        description:
            "Move from market price to business value. These guides explain the financial statements, per-share metrics, cash flow, valuation methods, and capital-allocation decisions used in fundamental stock research.",
        keywords: [
            "stock analysis",
            "fundamental analysis",
            "how to research stocks",
            "stock valuation",
        ],
        matchTags: [
            "fundamental-analysis",
            "valuation",
            "earnings",
            "eps",
            "free-cash-flow",
            "cash-flow",
            "buybacks",
            "capital-allocation",
            "stock-analysis",
        ],
        matchCategories: ["Fundamental Analysis", "Valuation"],
        tool: {
            href: "/valuation",
            label: "Open the valuation tool",
            description: "Turn revenue, margins, growth, and discount-rate assumptions into a valuation range.",
        },
    },
    {
        slug: "options",
        title: "Options",
        eyebrow: "Understand derivatives",
        shortDescription: "Learn calls, puts, premiums, payoff profiles, and the risks created by leverage.",
        description:
            "Understand how options transfer risk between buyers and sellers. Start with calls and puts, then connect contract terms, volatility, time decay, and payoff calculations to real option chains.",
        keywords: [
            "options education",
            "options for beginners",
            "calls and puts",
            "stock options explained",
        ],
        matchTags: ["options", "derivatives"],
        matchCategories: ["Options"],
        tool: {
            href: "/options",
            label: "Explore option chains",
            description: "Review contracts and model option positions after learning the fundamentals.",
        },
    },
    {
        slug: "portfolio-management",
        title: "Portfolio Management",
        eyebrow: "Manage risk",
        shortDescription: "Combine investments thoughtfully through diversification, allocation, and risk awareness.",
        description:
            "Learn how individual investments work together at the portfolio level. These guides focus on diversification, correlation, allocation, concentration, and preparing for different market conditions.",
        keywords: [
            "portfolio management",
            "portfolio diversification",
            "investment risk management",
            "asset allocation",
        ],
        matchTags: [
            "diversification",
            "portfolio-risk",
            "etfs",
            "bull-market",
            "bear-market",
            "fixed-income",
        ],
        matchCategories: ["Portfolio Management"],
        tool: {
            href: "/correlation",
            label: "Analyze portfolio correlation",
            description: "See where holdings may share the same underlying market exposure.",
        },
    },
]

export function getBlogTopic(slug: string): BlogTopic | undefined {
    return BLOG_TOPICS.find((topic) => topic.slug === slug)
}

function postMatchesTopic(post: Post, topic: BlogTopic): boolean {
    const categoryMatches =
        typeof post.frontmatter.category === "string" &&
        topic.matchCategories.includes(post.frontmatter.category)
    const tagMatches = post.frontmatter.tags.some((tag) => topic.matchTags.includes(tag))

    return categoryMatches || tagMatches
}

export function getPostsForTopic(topic: BlogTopic, posts = getAllPosts()): Post[] {
    return posts.filter((post) => postMatchesTopic(post, topic))
}

export function getPrimaryTopicForPost(post: Post): BlogTopic | undefined {
    return BLOG_TOPICS.find((topic) => postMatchesTopic(post, topic))
}
