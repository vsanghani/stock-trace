"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { CorrelationMatrix, CorrelationPair } from "@/types/correlation"
import { getCorrelationColor, getCorrelationTextColor } from "@/lib/correlation-calculator"
import { cn } from "@/lib/utils"

interface HeatmapGridProps {
    matrix: CorrelationMatrix
}

export function HeatmapGrid({ matrix }: HeatmapGridProps) {
    const [hoveredCell, setHoveredCell] = React.useState<{ i: number; j: number } | null>(null)
    const [isMobile, setIsMobile] = React.useState(false)

    // Check for mobile viewport
    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const { holdings, matrix: correlationMatrix, highRiskPairs } = matrix
    const n = holdings.length

    // Mobile view: Show top risky pairs list instead of full matrix
    if (isMobile && n > 4) {
        return <MobileRiskyPairsList pairs={highRiskPairs} allPairs={matrix.pairs} />
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                    {/* Column Headers */}
                    <div className="flex">
                        <div className="w-16 h-10 flex-shrink-0" /> {/* Empty corner cell */}
                        {holdings.map((holding, j) => (
                            <motion.div
                                key={`header-${j}`}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: j * 0.05 }}
                                className="w-14 h-10 flex items-center justify-center"
                            >
                                <span className="text-xs font-mono font-bold text-muted-foreground transform -rotate-45 origin-center whitespace-nowrap">
                                    {holding.ticker}
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Matrix Rows */}
                    {holdings.map((rowHolding, i) => (
                        <div key={`row-${i}`} className="flex">
                            {/* Row Header */}
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="w-16 h-14 flex items-center justify-end pr-2 flex-shrink-0"
                            >
                                <span className="text-xs font-mono font-bold text-muted-foreground">
                                    {rowHolding.ticker}
                                </span>
                            </motion.div>

                            {/* Cells */}
                            {holdings.map((colHolding, j) => {
                                const value = correlationMatrix[i][j]
                                const isHovered = hoveredCell?.i === i && hoveredCell?.j === j
                                const isDiagonal = i === j

                                return (
                                    <motion.div
                                        key={`cell-${i}-${j}`}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: (i * n + j) * 0.01 }}
                                        className={cn(
                                            "w-14 h-14 flex items-center justify-center relative cursor-pointer",
                                            "border border-border/20 transition-all duration-200",
                                            isHovered && "z-10 scale-110 shadow-lg"
                                        )}
                                        style={{
                                            backgroundColor: isDiagonal
                                                ? 'rgba(255, 255, 255, 0.05)'
                                                : getCorrelationColor(value),
                                        }}
                                        onMouseEnter={() => setHoveredCell({ i, j })}
                                        onMouseLeave={() => setHoveredCell(null)}
                                    >
                                        {/* Value display */}
                                        <span
                                            className={cn(
                                                "text-xs font-mono font-medium transition-opacity",
                                                isDiagonal ? "text-muted-foreground/50" : "",
                                                isHovered ? "opacity-100" : "opacity-0"
                                            )}
                                            style={{ color: isDiagonal ? undefined : getCorrelationTextColor(value) }}
                                        >
                                            {value.toFixed(2)}
                                        </span>

                                        {/* Hover tooltip */}
                                        {isHovered && !isDiagonal && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="absolute -bottom-16 left-1/2 -translate-x-1/2 z-20 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-xl whitespace-nowrap"
                                            >
                                                <div className="text-xs">
                                                    <span className="font-mono font-bold">{rowHolding.ticker}</span>
                                                    <span className="text-muted-foreground"> ↔ </span>
                                                    <span className="font-mono font-bold">{colHolding.ticker}</span>
                                                </div>
                                                <div className={cn(
                                                    "text-sm font-bold mt-0.5",
                                                    value >= 0.85 ? "text-red-500" :
                                                        value >= 0.60 ? "text-orange-500" :
                                                            value >= 0.30 ? "text-gray-400" :
                                                                "text-cyan-400"
                                                )}>
                                                    {value >= 0.85 ? "🔴 High Risk" :
                                                        value >= 0.60 ? "🟠 Moderate" :
                                                            value >= 0.30 ? "⚪ Neutral" :
                                                                "🟢 Low/Inverse"}
                                                    {" "}{(value * 100).toFixed(0)}%
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: getCorrelationColor(0.90) }} />
                    <span className="text-xs text-muted-foreground">High (0.8+)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: getCorrelationColor(0.65) }} />
                    <span className="text-xs text-muted-foreground">Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: getCorrelationColor(0.40) }} />
                    <span className="text-xs text-muted-foreground">Neutral</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: getCorrelationColor(0.15) }} />
                    <span className="text-xs text-muted-foreground">Low</span>
                </div>
            </div>
        </div>
    )
}

/**
 * Mobile-friendly list view of top risky pairs
 */
function MobileRiskyPairsList({ pairs, allPairs }: { pairs: CorrelationPair[]; allPairs: CorrelationPair[] }) {
    // Show top 5 highest correlation pairs
    const topPairs = [...allPairs]
        .sort((a, b) => b.correlation - a.correlation)
        .slice(0, 5)

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground text-center">
                Top 5 Correlated Pairs
            </h4>
            <div className="space-y-2">
                {topPairs.map((pair, i) => (
                    <motion.div
                        key={`${pair.tickerA}-${pair.tickerB}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                            "flex items-center justify-between p-4 rounded-lg border",
                            pair.correlation >= 0.85
                                ? "bg-red-500/10 border-red-500/30"
                                : pair.correlation >= 0.60
                                    ? "bg-orange-500/10 border-orange-500/30"
                                    : "bg-secondary/30 border-border/30"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className="font-mono font-bold">{pair.tickerA}</span>
                            <span className="text-muted-foreground">↔</span>
                            <span className="font-mono font-bold">{pair.tickerB}</span>
                        </div>
                        <div className={cn(
                            "text-lg font-mono font-bold",
                            pair.correlation >= 0.85 ? "text-red-500" :
                                pair.correlation >= 0.60 ? "text-orange-500" :
                                    "text-gray-400"
                        )}>
                            {(pair.correlation * 100).toFixed(0)}%
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
