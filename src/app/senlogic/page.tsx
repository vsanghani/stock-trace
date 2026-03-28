import { Metadata } from "next"
import Link from "next/link"
import { Activity, ArrowLeft, Zap, Brain, TrendingUp, Shield } from "lucide-react"

export const metadata: Metadata = {
    title: "senLogic - AI Sentiment Analysis | Stock Trace",
    description: "Learn how The Signal uses AI-powered sentiment analysis to decode market emotions and provide actionable insights.",
}

export default function SenLogicPage() {
    return (
        <main className="min-h-screen pt-24 pb-16 px-6">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Back Link */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>

                {/* Hero Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-red-500/20 border border-border/50">
                            <Activity className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">senLogic</h1>
                            <p className="text-muted-foreground">AI-Powered Market Sentiment</p>
                        </div>
                    </div>

                    <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                        <span className="text-foreground font-medium">The Signal</span> is our proprietary
                        sentiment analysis engine that decodes market emotions by analyzing
                        real-time news, social sentiment, and market indicators to give you
                        an instant "vibe check" on any stock.
                    </p>
                </div>

                {/* How It Works */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Brain className="w-6 h-6 text-primary" />
                        How It Works
                    </h2>

                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="glass rounded-xl p-6 space-y-3">
                            <div className="text-3xl font-mono font-bold text-primary">01</div>
                            <h3 className="font-semibold">Data Collection</h3>
                            <p className="text-sm text-muted-foreground">
                                We aggregate the latest 5-10 news headlines and social mentions for each ticker in real-time.
                            </p>
                        </div>

                        <div className="glass rounded-xl p-6 space-y-3">
                            <div className="text-3xl font-mono font-bold text-primary">02</div>
                            <h3 className="font-semibold">AI Analysis</h3>
                            <p className="text-sm text-muted-foreground">
                                Our LLM acts as a financial analyst, evaluating headline sentiment, tone, and market implications.
                            </p>
                        </div>

                        <div className="glass rounded-xl p-6 space-y-3">
                            <div className="text-3xl font-mono font-bold text-primary">03</div>
                            <h3 className="font-semibold">Score Generation</h3>
                            <p className="text-sm text-muted-foreground">
                                A 0-100 sentiment score is generated with a concise explanation of the market mood.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Score Guide */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        Score Interpretation
                    </h2>

                    <div className="glass rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-border/50">
                                <tr>
                                    <th className="px-6 py-4 text-sm font-semibold">Score Range</th>
                                    <th className="px-6 py-4 text-sm font-semibold">Label</th>
                                    <th className="px-6 py-4 text-sm font-semibold">Interpretation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                <tr>
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold" style={{ color: '#22c55e' }}>80-100</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}>
                                            Strong Bullish
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        Extreme optimism. Headlines reflect euphoria, breakout news, or overwhelmingly positive catalysts.
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold" style={{ color: '#4ade80' }}>60-79</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(74, 222, 128, 0.2)', color: '#4ade80' }}>
                                            Bullish
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        Positive momentum. Market sentiment leans optimistic with favorable news flow.
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold" style={{ color: '#6b7280' }}>40-59</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(107, 114, 128, 0.2)', color: '#6b7280' }}>
                                            Neutral
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        Mixed signals. Headlines are balanced or the market is in a wait-and-see mode.
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold" style={{ color: '#f97316' }}>20-39</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)', color: '#f97316' }}>
                                            Bearish
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        Cautious outlook. Negative headlines or concerns are emerging in the news cycle.
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-bold" style={{ color: '#ef4444' }}>0-19</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                                            Strong Bearish
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        Extreme fear. Headlines indicate panic, major negative events, or market crisis.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* The Pulse */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Zap className="w-6 h-6 text-primary" />
                        The Pulse Indicator
                    </h2>

                    <div className="glass rounded-xl p-6 flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                        </div>
                        <div className="space-y-2">
                            <p className="text-muted-foreground">
                                When you see a pulsing dot next to the sentiment badge, it means the analysis
                                was updated within the last <span className="text-foreground font-medium">60 minutes</span>.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                This "live" indicator helps you know when the sentiment is fresh and reflects
                                the most recent market developments.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Shield className="w-6 h-6 text-amber-500/90" />
                        Live data vs demo mode
                    </h2>
                    <div className="glass rounded-xl p-6 border border-amber-500/20 bg-amber-500/5">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Research-grade scores require configured{" "}
                            <span className="font-mono text-xs text-foreground/90">ALPHA_VANTAGE_API_KEY</span>{" "}
                            (headlines) and{" "}
                            <span className="font-mono text-xs text-foreground/90">OPENROUTER_API_KEY</span>{" "}
                            (LLM analysis). Without them—or when those APIs fail—the app uses{" "}
                            <span className="text-foreground font-medium">synthetic demo headlines and placeholder scoring</span>.
                            The dashboard shows an amber notice whenever output is not research-grade; treat those
                            results as illustrations only.
                        </p>
                    </div>
                </section>

                {/* Disclaimer */}
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Shield className="w-6 h-6 text-primary" />
                        Important Disclaimer
                    </h2>

                    <div className="glass rounded-xl p-6 border-l-4 border-l-orange-500/50">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            The Signal is designed to provide a quick sentiment snapshot based on publicly
                            available news. It is <span className="text-foreground font-medium">not financial advice</span> and
                            should not be the sole basis for any investment decision. Always conduct your own
                            research and consult with a qualified financial advisor before making investment decisions.
                            Sentiment can change rapidly and past sentiment does not guarantee future performance.
                        </p>
                    </div>
                </section>

                {/* CTA */}
                <div className="text-center pt-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Activity className="w-5 h-5" />
                        Try The Signal Now
                    </Link>
                </div>
            </div>
        </main>
    )
}
