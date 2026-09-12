"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { StockSearch } from "@/components/stock-search"
import { StockDashboard } from "@/components/stock-dashboard"
import { motion, AnimatePresence } from "framer-motion"
import { SITE_TAGLINE } from "@/lib/site"

const SUGGESTED_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "BHP.AX", "0700.HK"]

function DashboardContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const ticker = searchParams.get("ticker")

    const handleSearch = (query: string) => {
        router.push(`/dashboard?ticker=${encodeURIComponent(query)}`)
    }

    return (
        <div className="container mx-auto px-4 min-h-[calc(100vh-4rem)] flex flex-col items-center py-12 relative z-10">
            <AnimatePresence mode="wait">
                {!ticker ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl text-center space-y-8 mt-20"
                    >
                        <div className="space-y-4">
                            <h1 className="text-5xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
                                Research a stock
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground">
                                {SITE_TAGLINE}
                            </p>
                        </div>

                        <div className="space-y-6 w-full flex flex-col items-center">
                            <StockSearch onSearch={handleSearch} />

                            <div className="flex flex-wrap items-center justify-center gap-2">
                                {SUGGESTED_TICKERS.map((symbol) => (
                                    <button
                                        key={symbol}
                                        onClick={() => handleSearch(symbol)}
                                        className="px-3 py-1.5 text-xs font-mono rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                                    >
                                        {symbol}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="dashboard"
                        className="w-full space-y-8"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex flex-col w-full items-center gap-4">
                            <div className="w-full max-w-xl flex flex-col gap-4">
                                <StockSearch onSearch={handleSearch} />
                            </div>
                        </div>
                        <StockDashboard ticker={ticker} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={null}>
            <DashboardContent />
        </Suspense>
    )
}
