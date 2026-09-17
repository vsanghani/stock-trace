import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { BlogTopic } from "@/lib/blog-topics"

type TopicCardProps = {
    topic: BlogTopic
    articleCount: number
}

export default function TopicCard({ topic, articleCount }: TopicCardProps) {
    return (
        <Link
            href={`/blog/topics/${topic.slug}`}
            className="group flex h-full flex-col rounded-2xl border border-border bg-background/70 p-6 transition-all hover:-translate-y-0.5 hover:border-amber-600/50 hover:shadow-lg"
        >
            <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">
                    {topic.eyebrow}
                </span>
                <span className="text-xs text-muted-foreground">
                    {articleCount} {articleCount === 1 ? "guide" : "guides"}
                </span>
            </div>
            <h3 className="mt-4 text-xl font-bold tracking-tight">{topic.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                {topic.shortDescription}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold">
                Explore topic
                <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                />
            </span>
        </Link>
    )
}
