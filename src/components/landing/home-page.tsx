import Link from "next/link"
import {
    ArrowRight,
    BarChart3,
    FlaskConical,
    LineChart,
    Target,
    type LucideIcon,
} from "lucide-react"
import { Faq } from "@/components/landing/faq"
import { LandingSearch } from "@/components/landing/landing-search"
import { MarketsCovered } from "@/components/landing/markets-covered"
import { ProductPreview } from "@/components/landing/product-preview"
import { SITE_DISCLAIMER, SITE_NAME } from "@/lib/site"

const FEATURES: {
    icon: LucideIcon
    status: string
    title: string
    description: string
}[] = [
    {
        icon: LineChart,
        status: "Available now",
        title: "Latest quotes",
        description:
            "Search a listed company and see its latest price, daily change, market cap and 52-week range when the data provider returns them.",
    },
    {
        icon: BarChart3,
        status: "Available now",
        title: "Company stats",
        description:
            "The same view can include P/E, price-to-book, return on equity and debt-to-equity. If a figure is missing, the screen leaves it out instead of inventing one.",
    },
    {
        icon: FlaskConical,
        status: "In the app",
        title: "Research tools",
        description:
            "Valuation, options, sentiment, correlation, stress tests, a P&L log and alerts are already in the workspace. Deeper analysis behind them is still being built.",
    },
    {
        icon: Target,
        status: "Coming",
        title: "Recommendations",
        description:
            "Plutox does not tell you to buy or sell. Stock recommendations are planned, and they will be marked as information, not advice.",
    },
]

const STEPS = [
    {
        title: "Search a ticker",
        description:
            "Type a symbol or company name. Suggestions come from public symbol search, and you do not need an account to see them.",
    },
    {
        title: "Open the dashboard",
        description:
            "The research view asks you to sign in, then loads the stock you asked for. This page stays public.",
    },
    {
        title: "Read the quote",
        description:
            "Use the price and the stats beside it. The other tools are in the app, with deeper analysis still to come.",
    },
] as const

const primaryCtaClass =
    "inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"

export function HomePage() {
    return (
        <div className="relative z-10">
            <section className="container mx-auto px-4 pt-10 pb-20 sm:pt-16 sm:pb-24 flex flex-col items-center text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Stock tracking
                </p>
                <h1 className="mt-4 max-w-4xl text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter text-foreground">
                    Track stocks in one workspace.
                </h1>
                <p className="mt-5 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                    {SITE_NAME} is where you look up a listed company and read the latest price next to the stats that come with it. Deeper analysis and stock recommendations are on the way.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link href="/dashboard" className={primaryCtaClass}>
                        Open the dashboard
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                    <a
                        href="#preview"
                        className="inline-flex items-center h-11 px-6 rounded-xl border border-border text-sm font-semibold hover:bg-secondary/50 transition-colors"
                    >
                        See the layout
                    </a>
                </div>

                <div className="mt-12 w-full max-w-xl">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Or search a ticker
                    </p>
                    <LandingSearch />
                </div>

                <div className="mt-16">
                    <MarketsCovered />
                </div>
            </section>

            <section id="features" aria-labelledby="features-heading" className="scroll-mt-24 border-t border-border">
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-2xl">
                        <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold tracking-tighter">
                            What you can do today
                        </h2>
                        <p className="mt-4 text-muted-foreground leading-relaxed">
                            The workspace is open. Price and company stats are the part that is ready. Everything else is labeled so you know what is still being built.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {FEATURES.map((feature) => (
                            <div
                                key={feature.title}
                                className="p-6 rounded-2xl border border-border bg-background/70 backdrop-blur-md hover:border-foreground/20 transition-colors"
                            >
                                <feature.icon className="w-5 h-5 text-foreground" aria-hidden="true" />
                                <p className="mt-4 text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                                    {feature.status}
                                </p>
                                <h3 className="mt-2 font-semibold">{feature.title}</h3>
                                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-24 border-t border-border">
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-2xl">
                        <h2 id="how-heading" className="text-3xl sm:text-4xl font-bold tracking-tighter">
                            How it works
                        </h2>
                        <p className="mt-4 text-muted-foreground leading-relaxed">
                            Three steps. An account is only needed once you open the research view.
                        </p>
                    </div>

                    <ol className="mt-12 grid gap-6 md:grid-cols-3">
                        {STEPS.map((step, index) => (
                            <li
                                key={step.title}
                                className="p-6 rounded-2xl border border-border bg-background/70 backdrop-blur-md"
                            >
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground text-sm font-mono font-bold">
                                    {index + 1}
                                </span>
                                <h3 className="mt-4 font-semibold">{step.title}</h3>
                                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                    {step.description}
                                </p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            <section id="preview" aria-labelledby="preview-heading" className="scroll-mt-24 border-t border-border">
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-2xl">
                        <h2 id="preview-heading" className="text-3xl sm:text-4xl font-bold tracking-tighter">
                            A look at the dashboard
                        </h2>
                        <p className="mt-4 text-muted-foreground leading-relaxed">
                            The same cards the research view uses. Nothing in this sample is a live figure.
                        </p>
                    </div>
                    <div className="mt-12">
                        <ProductPreview />
                    </div>
                </div>
            </section>

            <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-24 border-t border-border">
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-2xl">
                        <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold tracking-tighter">
                            Questions
                        </h2>
                        <p className="mt-4 text-muted-foreground leading-relaxed">
                            Short answers. The <Link href="/terms" className="text-foreground underline-offset-4 hover:underline">terms</Link> and <Link href="/privacy" className="text-foreground underline-offset-4 hover:underline">privacy policy</Link> have the longer version.
                        </p>
                    </div>
                    <Faq />
                </div>
            </section>

            <section aria-labelledby="cta-heading" className="border-t border-border">
                <div className="container mx-auto px-4 py-20">
                    <div className="p-8 sm:p-14 rounded-3xl border border-border bg-background/70 backdrop-blur-md flex flex-col items-center text-center">
                        <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold tracking-tighter">
                            Open the dashboard
                        </h2>
                        <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
                            Search a ticker there, or search from this page and we will take you to it after you sign in. Creating an account is free.
                        </p>
                        <Link href="/dashboard" className={`mt-8 ${primaryCtaClass}`}>
                            Open the dashboard
                            <ArrowRight className="w-4 h-4" aria-hidden="true" />
                        </Link>
                        <p className="mt-10 max-w-xl text-xs leading-relaxed text-muted-foreground">
                            {SITE_DISCLAIMER}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    )
}
