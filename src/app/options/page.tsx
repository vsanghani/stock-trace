"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Search,
    TrendingUp,
    TrendingDown,
    Activity,
    Loader2,
    BarChart3,
    ArrowRight,
} from "lucide-react"
import type { OptionsData, OptionContract } from "@/types/options"
import { OptionsChain } from "@/components/options/OptionsChain"
import { OptionsFilters } from "@/components/options/OptionsFilters"

const POPULAR_TICKERS = ["AAPL", "TSLA", "NVDA", "AMZN", "MSFT", "META", "GOOGL", "SPY"]

export default function OptionsPage() {
    const [ticker, setTicker] = React.useState("")
    const [searchInput, setSearchInput] = React.useState("")
    const [data, setData] = React.useState<OptionsData | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // Filters
    const [selectedExpiry, setSelectedExpiry] = React.useState("")
    const [minStrike, setMinStrike] = React.useState("")
    const [maxStrike, setMaxStrike] = React.useState("")
    const [itmOnly, setItmOnly] = React.useState(false)
    const [tab, setTab] = React.useState<"calls" | "puts">("calls")

    const fetchOptions = React.useCallback(async (symbol: string, date?: string) => {
        if (!symbol) return
        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams({ ticker: symbol })
            if (date) params.set("date", date)

            const res = await fetch(`/api/options?${params.toString()}`)

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to fetch options data")
            }

            const result: OptionsData = await res.json()
            setData(result)
            setTicker(symbol.toUpperCase())

            // Set default expiry to first available
            if (result.expirationDates.length > 0 && !date) {
                setSelectedExpiry(result.expirationDates[0])
            }
        } catch (e: any) {
            setError(e.message || "Something went wrong")
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchInput.trim()) {
            setSelectedExpiry("")
            setMinStrike("")
            setMaxStrike("")
            setItmOnly(false)
            fetchOptions(searchInput.trim())
        }
    }

    const handleExpiryChange = (expiry: string) => {
        setSelectedExpiry(expiry)
        if (ticker) {
            fetchOptions(ticker, expiry)
        }
    }

    // Get the active expiration's contracts
    const activeExpiration = React.useMemo(() => {
        if (!data || !data.options.length) return null
        if (selectedExpiry) {
            return data.options.find(
                (o) => o.expirationDate === selectedExpiry
            ) || data.options[0]
        }
        return data.options[0]
    }, [data, selectedExpiry])

    // Filtered contracts
    const filteredContracts = React.useMemo(() => {
        if (!activeExpiration) return []
        const contracts: OptionContract[] =
            tab === "calls" ? activeExpiration.calls : activeExpiration.puts

        return contracts.filter((c) => {
            if (minStrike && c.strike < parseFloat(minStrike)) return false
            if (maxStrike && c.strike > parseFloat(maxStrike)) return false
            if (itmOnly && !c.inTheMoney) return false
            return true
        })
    }, [activeExpiration, tab, minStrike, maxStrike, itmOnly])

    // Summary stats
    const stats = React.useMemo(() => {
        if (!activeExpiration) return null
        const allCalls = activeExpiration.calls
        const allPuts = activeExpiration.puts
        const totalCallVolume = allCalls.reduce((s, c) => s + (c.volume ?? 0), 0)
        const totalPutVolume = allPuts.reduce((s, c) => s + (c.volume ?? 0), 0)
        const totalCallOI = allCalls.reduce((s, c) => s + (c.openInterest ?? 0), 0)
        const totalPutOI = allPuts.reduce((s, c) => s + (c.openInterest ?? 0), 0)
        const pcRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 0
        return { totalCallVolume, totalPutVolume, totalCallOI, totalPutOI, pcRatio }
    }, [activeExpiration])

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen max-w-7xl">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                {/* Header */}
                <div className="text-center space-y-4 mb-8">
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-extrabold tracking-tighter sm:text-5xl"
                    >
                        Options Chain
                    </motion.h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Explore real-time options contracts for any US-listed stock.
                        Filter by expiry, price, and contract type.
                    </p>
                </div>

                {/* Search */}
                <motion.form
                    onSubmit={handleSearch}
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
                                placeholder="Enter ticker symbol (e.g. AAPL, TSLA, SPY)"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
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
                            Search
                        </button>
                    </div>

                    {/* Quick tickers */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {POPULAR_TICKERS.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => {
                                    setSearchInput(t)
                                    setSelectedExpiry("")
                                    setMinStrike("")
                                    setMaxStrike("")
                                    setItmOnly(false)
                                    fetchOptions(t)
                                }}
                                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${ticker === t
                                        ? "bg-foreground text-background border-foreground"
                                        : "bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </motion.form>

                {/* Error */}
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

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div
                                key={i}
                                className="glass rounded-2xl h-20 animate-pulse"
                            />
                        ))}
                    </div>
                )}

                {/* Results */}
                <AnimatePresence mode="wait">
                    {data && !loading && (
                        <motion.div
                            key={ticker}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Quote summary */}
                            <div className="glass rounded-2xl p-5">
                                <div className="flex flex-wrap items-center gap-4 justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
                                            {data.quote.symbol.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight">
                                                {data.quote.symbol}
                                            </h2>
                                            <p className="text-sm text-muted-foreground">
                                                {data.quote.shortName}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-2xl font-bold font-mono">
                                                ${data.quote.regularMarketPrice?.toFixed(2)}
                                            </div>
                                            <div
                                                className={`flex items-center gap-1 text-sm font-medium ${data.quote.regularMarketChange >= 0
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-rose-600 dark:text-rose-400"
                                                    }`}
                                            >
                                                {data.quote.regularMarketChange >= 0 ? (
                                                    <TrendingUp className="w-3.5 h-3.5" />
                                                ) : (
                                                    <TrendingDown className="w-3.5 h-3.5" />
                                                )}
                                                {data.quote.regularMarketChange >= 0
                                                    ? "+"
                                                    : ""}
                                                {data.quote.regularMarketChange?.toFixed(2)} (
                                                {data.quote.regularMarketChangePercent >= 0
                                                    ? "+"
                                                    : ""}
                                                {data.quote.regularMarketChangePercent?.toFixed(
                                                    2
                                                )}
                                                %)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats bar */}
                            {stats && (
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    {[
                                        {
                                            label: "Call Volume",
                                            value: stats.totalCallVolume.toLocaleString(),
                                            icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
                                        },
                                        {
                                            label: "Put Volume",
                                            value: stats.totalPutVolume.toLocaleString(),
                                            icon: <TrendingDown className="w-4 h-4 text-rose-500" />,
                                        },
                                        {
                                            label: "Call OI",
                                            value: stats.totalCallOI.toLocaleString(),
                                            icon: <BarChart3 className="w-4 h-4 text-indigo-500" />,
                                        },
                                        {
                                            label: "Put OI",
                                            value: stats.totalPutOI.toLocaleString(),
                                            icon: <BarChart3 className="w-4 h-4 text-amber-500" />,
                                        },
                                        {
                                            label: "P/C Ratio",
                                            value: stats.pcRatio.toFixed(2),
                                            icon: <Activity className="w-4 h-4 text-violet-500" />,
                                        },
                                    ].map((stat) => (
                                        <motion.div
                                            key={stat.label}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="glass rounded-xl p-3.5 flex items-center gap-3"
                                        >
                                            {stat.icon}
                                            <div>
                                                <div className="text-xs text-muted-foreground">
                                                    {stat.label}
                                                </div>
                                                <div className="text-sm font-bold font-mono">
                                                    {stat.value}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* Filters */}
                            {data.expirationDates.length > 0 && (
                                <OptionsFilters
                                    expirationDates={data.expirationDates}
                                    selectedExpiry={
                                        selectedExpiry || data.expirationDates[0]
                                    }
                                    onExpiryChange={handleExpiryChange}
                                    minStrike={minStrike}
                                    maxStrike={maxStrike}
                                    onMinStrikeChange={setMinStrike}
                                    onMaxStrikeChange={setMaxStrike}
                                    itmOnly={itmOnly}
                                    onItmToggle={setItmOnly}
                                />
                            )}

                            {/* Tabs */}
                            <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/40 border border-border/50 w-fit">
                                {(["calls", "puts"] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTab(t)}
                                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t
                                                ? t === "calls"
                                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-sm"
                                                    : "bg-rose-500/15 text-rose-700 dark:text-rose-400 shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                            }`}
                                    >
                                        {t === "calls" ? "📈 Calls" : "📉 Puts"}
                                        {activeExpiration && (
                                            <span className="ml-1.5 text-xs opacity-60">
                                                (
                                                {t === "calls"
                                                    ? activeExpiration.calls.length
                                                    : activeExpiration.puts.length}
                                                )
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Options Chain Table */}
                            <OptionsChain
                                contracts={filteredContracts}
                                type={tab}
                                currentPrice={data.quote.regularMarketPrice}
                            />

                            {/* Footer info */}
                            <div className="text-center text-xs text-muted-foreground pb-8">
                                Showing {data.expirationDates.length} expiration{data.expirationDates.length !== 1 ? "s" : ""} •{" "}
                                {data.strikes.length} strike{data.strikes.length !== 1 ? "s" : ""} •{" "}
                                Data from Yahoo Finance
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty state */}
                {!data && !loading && !error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="glass rounded-2xl p-16 text-center space-y-4"
                    >
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                            <BarChart3 className="w-8 h-8 text-indigo-500" />
                        </div>
                        <h3 className="text-lg font-semibold">
                            Search for a stock to view its options chain
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                            Enter a ticker symbol above or click one of the popular
                            tickers to get started. You&apos;ll see all available calls and
                            puts with real-time pricing data.
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    )
}
