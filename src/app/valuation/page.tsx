"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Calculator, Loader2, Search } from "lucide-react"

import {
    DEFAULT_DCF_ASSUMPTIONS,
    buildSensitivityMatrix,
    calculateDcf,
    validateDcfInputs,
    type DcfAssumptions,
    type DcfInputs,
} from "@/lib/finance"
import { AssumptionsCard } from "@/components/valuation/AssumptionsCard"
import { SensitivityHeatmap } from "@/components/valuation/SensitivityHeatmap"
import { ValuationBreakdown } from "@/components/valuation/ValuationBreakdown"
import { VerdictBanner } from "@/components/valuation/VerdictBanner"
import type { ValuationSnapshot } from "@/types/valuation"

const POPULAR_TICKERS = ["AAPL", "NVDA", "MSFT", "TSLA", "GOOGL", "AMZN"]

/** Slider step for the growth rate, used to snap the seeded benchmark. */
const GROWTH_STEP = 0.005

/**
 * Seed the growth slider from the company's own history, capped well below the
 * historic rate for hypergrowth names where extrapolating five years would be
 * indefensible.
 */
function seedAssumptions(snapshot: ValuationSnapshot): Required<DcfAssumptions> {
    const benchmark = snapshot.freeCashFlowGrowth ?? snapshot.revenueGrowth

    if (benchmark === null || !Number.isFinite(benchmark)) {
        return { ...DEFAULT_DCF_ASSUMPTIONS }
    }

    const bounded = Math.min(0.2, Math.max(0, benchmark))
    return {
        ...DEFAULT_DCF_ASSUMPTIONS,
        growthRate: Math.round(bounded / GROWTH_STEP) * GROWTH_STEP,
    }
}

export default function ValuationPage() {
    const [searchInput, setSearchInput] = React.useState("")
    const [snapshot, setSnapshot] = React.useState<ValuationSnapshot | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [assumptions, setAssumptions] = React.useState<Required<DcfAssumptions>>(
        DEFAULT_DCF_ASSUMPTIONS
    )
    const [freeCashFlow, setFreeCashFlow] = React.useState<number | null>(null)

    const loadTicker = React.useCallback(async (ticker: string) => {
        const symbol = ticker.trim().toUpperCase()
        if (!symbol) return

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`/api/valuation/${encodeURIComponent(symbol)}`)
            if (!response.ok) {
                const body = await response.json().catch(() => null)
                throw new Error(body?.error ?? `Could not load data for ${symbol}`)
            }

            const data: ValuationSnapshot = await response.json()
            setSnapshot(data)
            setAssumptions(seedAssumptions(data))
            setFreeCashFlow(data.freeCashFlow)
            setSearchInput(data.ticker)
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Something went wrong")
            setSnapshot(null)
            setFreeCashFlow(null)
        } finally {
            setLoading(false)
        }
    }, [])

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        void loadTicker(searchInput)
    }

    const inputs = React.useMemo<DcfInputs | null>(() => {
        if (!snapshot || freeCashFlow === null) return null
        return {
            freeCashFlow,
            sharesOutstanding: snapshot.sharesOutstanding,
            netDebt: snapshot.netDebt,
            currentPrice: snapshot.currentPrice,
            assumptions,
        }
    }, [snapshot, freeCashFlow, assumptions])

    const result = React.useMemo(() => (inputs ? calculateDcf(inputs) : null), [inputs])
    const errors = React.useMemo(() => (inputs ? validateDcfInputs(inputs) : []), [inputs])
    const matrix = React.useMemo(() => (inputs ? buildSensitivityMatrix(inputs) : null), [inputs])

    const seeded = React.useMemo(
        () => (snapshot ? seedAssumptions(snapshot) : DEFAULT_DCF_ASSUMPTIONS),
        [snapshot]
    )

    const isModified = Boolean(
        snapshot &&
            (assumptions.growthRate !== seeded.growthRate ||
                assumptions.discountRate !== seeded.discountRate ||
                assumptions.terminalGrowthRate !== seeded.terminalGrowthRate ||
                freeCashFlow !== snapshot.freeCashFlow)
    )

    const handleReset = () => {
        if (!snapshot) return
        setAssumptions(seeded)
        setFreeCashFlow(snapshot.freeCashFlow)
    }

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-7xl">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                <div className="text-center space-y-4 mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
                        Fair Value Analyzer
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Estimate what a company is worth with a five-year discounted cash flow
                        model, then stress the assumptions that actually move the answer.
                    </p>
                </div>

                <motion.form
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="glass rounded-2xl p-5"
                >
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                            <input
                                type="text"
                                placeholder="Enter ticker symbol (e.g. AAPL, NVDA, MSFT)"
                                value={searchInput}
                                onChange={(event) =>
                                    setSearchInput(event.target.value.toUpperCase())
                                }
                                className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 text-sm font-mono transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !searchInput.trim()}
                            className="px-6 py-3 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <ArrowRight className="w-4 h-4" />
                            )}
                            Analyze
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                        {POPULAR_TICKERS.map((ticker) => (
                            <button
                                key={ticker}
                                type="button"
                                onClick={() => void loadTicker(ticker)}
                                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                                    snapshot?.ticker === ticker
                                        ? "bg-foreground text-background border-foreground"
                                        : "bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                                }`}
                            >
                                {ticker}
                            </button>
                        ))}
                    </div>
                </motion.form>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="px-5 py-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {loading && (
                    <div className="space-y-4">
                        <div className="glass rounded-2xl h-48 animate-pulse" />
                        <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-6">
                            <div className="glass rounded-2xl h-96 animate-pulse" />
                            <div className="glass rounded-2xl h-96 animate-pulse" />
                        </div>
                    </div>
                )}

                {snapshot && !loading && (
                    <motion.div
                        key={snapshot.ticker}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <VerdictBanner snapshot={snapshot} result={result} errors={errors} />

                        <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-6 items-start">
                            <AssumptionsCard
                                snapshot={snapshot}
                                assumptions={assumptions}
                                onAssumptionsChange={setAssumptions}
                                freeCashFlow={freeCashFlow ?? snapshot.freeCashFlow}
                                onFreeCashFlowChange={setFreeCashFlow}
                                onReset={handleReset}
                                isModified={isModified}
                            />

                            <div className="space-y-6 min-w-0">
                                {matrix && (
                                    <SensitivityHeatmap
                                        matrix={matrix}
                                        currency={snapshot.currency}
                                    />
                                )}
                                {result && (
                                    <ValuationBreakdown snapshot={snapshot} result={result} />
                                )}
                            </div>
                        </div>

                        <p className="text-center text-xs text-muted-foreground pb-8">
                            For research only, not investment advice. A discounted cash flow is
                            only as good as the assumptions you feed it.
                        </p>
                    </motion.div>
                )}

                {!snapshot && !loading && !error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="glass rounded-2xl p-16 text-center space-y-4"
                    >
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                            <Calculator className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-semibold">
                            Search for a stock to estimate its intrinsic value
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            We pull free cash flow, net debt, and shares outstanding, then project
                            five years forward and discount back to today. Every assumption stays
                            editable.
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    )
}
