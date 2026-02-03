"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingDown, ArrowDown, DollarSign } from "lucide-react"
import { StressTestResult } from "@/types/stress-test"
import { formatCurrency, formatPercent } from "@/lib/stress-calculator"
import { cn } from "@/lib/utils"

interface ImpactVisualizationProps {
    result: StressTestResult | null
    isSimulating: boolean
}

export function ImpactVisualization({ result, isSimulating }: ImpactVisualizationProps) {
    if (!result && !isSimulating) {
        return (
            <div className="glass rounded-xl p-8 text-center">
                <div className="text-muted-foreground">
                    <TrendingDown className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Select a scenario and run simulation to see projected impact</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Main Impact Card */}
            <motion.div
                className="glass rounded-xl p-6 md:p-8 overflow-hidden relative"
                initial={false}
                animate={isSimulating ? { scale: [1, 0.98, 1] } : {}}
                transition={{ duration: 0.5 }}
            >
                {/* Simulation overlay */}
                <AnimatePresence>
                    {isSimulating && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center"
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-12 h-12 border-4 border-red-500/30 border-t-red-500 rounded-full"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="space-y-6"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-medium text-muted-foreground">
                                    Hypothetical Drawdown
                                </h3>
                                <p className="text-sm text-muted-foreground/60">
                                    {result.scenario.name}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground">Portfolio Value</div>
                                <div className="font-mono text-lg">
                                    {formatCurrency(result.totalCurrentValue)} → {formatCurrency(result.totalProjectedValue)}
                                </div>
                            </div>
                        </div>

                        {/* Big Loss Numbers */}
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-center py-6 border-y border-border/30">
                            <motion.div
                                className="text-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.3 }}
                            >
                                <div className="flex items-center justify-center gap-2 text-red-500">
                                    <DollarSign className="w-8 h-8" />
                                    <span className="text-5xl font-mono font-bold">
                                        {formatCurrency(result.totalProjectedLoss)}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Projected Loss</p>
                            </motion.div>

                            <div className="hidden md:block w-px h-16 bg-border/30" />

                            <motion.div
                                className="text-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.4 }}
                            >
                                <div className="flex items-center justify-center gap-2 text-red-500">
                                    <ArrowDown className="w-8 h-8" />
                                    <span className="text-5xl font-mono font-bold">
                                        {formatPercent(result.totalProjectedLossPercent)}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Portfolio Decline</p>
                            </motion.div>
                        </div>

                        {/* Per-Holding Breakdown */}
                        {result.holdingBreakdown.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground">Breakdown by Holding</h4>
                                <div className="space-y-2">
                                    {result.holdingBreakdown.map((item, i) => {
                                        const lossPercent = Math.abs(item.projectedLossPercent * 100)
                                        return (
                                            <motion.div
                                                key={item.holding.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.5 + i * 0.1 }}
                                                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold">{item.holding.ticker}</span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                                            {item.holding.sector}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {item.sectorMultiplier.toFixed(1)}x β
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {item.holding.shares} shares @ {formatCurrency(item.holding.currentPrice)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={cn(
                                                        "font-mono font-bold",
                                                        lossPercent >= 40 ? "text-red-500" :
                                                            lossPercent >= 25 ? "text-orange-500" :
                                                                "text-yellow-500"
                                                    )}>
                                                        {formatCurrency(item.projectedLoss)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatPercent(item.projectedLossPercent)}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </motion.div>
        </div>
    )
}
