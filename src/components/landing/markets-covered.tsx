"use client"

import * as React from "react"
import { Globe2, Minus, Plus } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

const PRIMARY_MARKETS = ["NYSE", "NASDAQ", "ASX", "HKEX", "JPX", "LSE"]
const MORE_MARKETS = ["TSX", "EURONEXT", "SGX", "NSE", "SIX", "KRX", "BME", "SSE"]

function MarketChip({ market }: { market: string }) {
    return (
        <span className="px-3 py-1 rounded-lg border border-border bg-background/80 text-xs font-mono text-foreground/80">
            {market}
        </span>
    )
}

export function MarketsCovered() {
    const [expanded, setExpanded] = React.useState(false)

    return (
        <div className="flex flex-col items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
                <Globe2 className="w-3.5 h-3.5" />
                Markets covered
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
                {PRIMARY_MARKETS.map((market) => (
                    <MarketChip key={market} market={market} />
                ))}
                <button
                    type="button"
                    onClick={() => setExpanded((open) => !open)}
                    aria-expanded={expanded}
                    aria-label={expanded ? "Hide additional markets" : "Show more markets"}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-border bg-secondary text-xs font-mono font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                >
                    {expanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {expanded ? "less" : "more"}
                </button>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            {MORE_MARKETS.map((market) => (
                                <MarketChip key={market} market={market} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
