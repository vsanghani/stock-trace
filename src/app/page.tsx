import Link from "next/link"
import { redirect } from "next/navigation"
import { Show } from "@clerk/nextjs"
import {
    ArrowRight,
    BellRing,
    Brain,
    CalendarDays,
    Calculator,
    Grid3x3,
    Layers,
    LineChart,
    ShieldAlert,
} from "lucide-react"
import { LandingSearch } from "@/components/landing/landing-search"
import { MarketsCovered } from "@/components/landing/markets-covered"
import { SITE_NAME } from "@/lib/site"

const FEATURES = [
    {
        icon: LineChart,
        title: "Stock dashboard",
        description:
            "Live price, market cap, 52-week range, P/E, P/B, ROE and debt-to-equity for any listed company — plus analyst consensus, price targets and recent upgrades.",
    },
    {
        icon: Brain,
        title: "senLogic sentiment",
        description:
            "Recent headlines are scored by an AI model and condensed into a single sentiment reading, so you can see how the news is leaning before you dig in.",
    },
    {
        icon: Calculator,
        title: "DCF valuation",
        description:
            "Build a discounted cash flow model with adjustable growth and WACC assumptions, then read the over/under-valued verdict against the current price.",
    },
    {
        icon: Layers,
        title: "Options chain",
        description:
            "Browse calls and puts across expiries with strike and in-the-money filters, straight from live market data.",
    },
    {
        icon: Grid3x3,
        title: "Correlation heatmap",
        description:
            "See which of your holdings actually move together, and where you are unknowingly doubling down on the same risk.",
    },
    {
        icon: ShieldAlert,
        title: "Portfolio stress test",
        description:
            "Replay historical shock scenarios against your holdings and see the projected damage before the market does it for you.",
    },
    {
        icon: CalendarDays,
        title: "P&L calculator",
        description:
            "Log trades against a calendar view to track realised profit and loss day by day.",
    },
    {
        icon: BellRing,
        title: "Whisper alerts",
        description:
            "Set conditional alerts on price and other triggers, and get notified when something you care about happens.",
    },
]

const STEPS = [
    {
        title: "Search a ticker",
        description:
            "Type a symbol or company name in the box above. Autocomplete covers listings across major global exchanges.",
    },
    {
        title: "Create your free account",
        description:
            "Sign up with an email address or a social login. You will land directly on the stock you searched for.",
    },
    {
        title: "Research and stress test",
        description:
            "Read the fundamentals, check the sentiment, model a valuation, then run your holdings through the risk tools.",
    },
]

export default async function LandingPage({
    searchParams,
}: {
    searchParams: Promise<{ ticker?: string }>
}) {
    // The research view used to live here as `/?ticker=`; keep those links working.
    const { ticker } = await searchParams
    if (ticker) {
        redirect(`/dashboard?ticker=${encodeURIComponent(ticker)}`)
    }

    return (
        <div className="relative z-10">
            {/* Hero */}
            <section className="container mx-auto px-4 pt-28 pb-24 flex flex-col items-center text-center">
                <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter text-foreground">
                    {SITE_NAME}
                </h1>
                <p className="mt-3 max-w-md text-base sm:text-lg text-muted-foreground leading-snug">
                    Equity research, sentiment and risk tools in one place
                </p>

                <div className="mt-12 w-full max-w-xl">
                    <LandingSearch />
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Show when="signed-out">
                        <Link
                            href="/sign-up"
                            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            Create a free account
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/sign-in"
                            className="inline-flex items-center h-11 px-6 rounded-xl border border-border text-sm font-semibold hover:bg-secondary/50 transition-colors"
                        >
                            Sign in
                        </Link>
                    </Show>
                    <Show when="signed-in">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            Open your dashboard
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </Show>
                </div>

                <div className="mt-16">
                    <MarketsCovered />
                </div>
            </section>

            {/* Features */}
            <section className="container mx-auto px-4 py-20 border-t border-border">
                <div className="max-w-2xl">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">
                        What you can do with {SITE_NAME}
                    </h2>
                    <p className="mt-4 text-muted-foreground">
                        Every tool runs on live market data. Start with a single ticker, or load
                        your whole portfolio and look at it as one position.
                    </p>
                </div>

                <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {FEATURES.map((feature) => (
                        <div
                            key={feature.title}
                            className="p-6 rounded-2xl border border-border bg-background/70 backdrop-blur-md hover:border-foreground/20 transition-colors"
                        >
                            <feature.icon className="w-5 h-5 text-foreground" />
                            <h3 className="mt-4 font-semibold">{feature.title}</h3>
                            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it works */}
            <section className="container mx-auto px-4 py-20 border-t border-border">
                <div className="max-w-2xl">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">
                        How to get started
                    </h2>
                    <p className="mt-4 text-muted-foreground">
                        Three steps, and the first one is already on this page.
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
            </section>

            {/* Closing CTA */}
            <section className="container mx-auto px-4 py-20 border-t border-border">
                <div className="p-10 sm:p-14 rounded-3xl border border-border bg-background/70 backdrop-blur-md flex flex-col items-center text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter">
                        Start with one ticker
                    </h2>
                    <p className="mt-4 max-w-xl text-muted-foreground">
                        Creating an account is free and takes about thirty seconds. Your portfolio
                        tools stay on your device.
                    </p>
                    <Show
                        when="signed-out"
                        fallback={
                            <Link
                                href="/dashboard"
                                className="mt-8 inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                                Open your dashboard
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        }
                    >
                        <Link
                            href="/sign-up"
                            className="mt-8 inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            Create a free account
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </Show>
                    <p className="mt-10 max-w-xl text-xs text-muted-foreground">
                        {SITE_NAME} is a research tool, not financial advice. Market data is
                        provided as-is and may be delayed or incomplete. Always do your own
                        research before making an investment decision.
                    </p>
                </div>
            </section>
        </div>
    )
}
