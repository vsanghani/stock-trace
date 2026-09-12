import type { ReactNode } from "react"

type LegalPageProps = {
    title: string
    description?: string
    lastUpdated?: string
    children: ReactNode
}

export function LegalPage({ title, description, lastUpdated, children }: LegalPageProps) {
    return (
        <article className="container mx-auto px-4 py-12 md:py-20">
            <div className="mx-auto max-w-3xl">
                <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                    {title}
                </h1>
                {lastUpdated && (
                    <p className="mt-3 text-sm text-muted-foreground">
                        Last updated {lastUpdated}
                    </p>
                )}
                {description && (
                    <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                        {description}
                    </p>
                )}
                <div className="prose prose-lg dark:prose-invert mt-10 max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-amber-700 dark:prose-a:text-amber-400 prose-p:text-foreground/90 prose-li:text-foreground/90">
                    {children}
                </div>
            </div>
        </article>
    )
}
