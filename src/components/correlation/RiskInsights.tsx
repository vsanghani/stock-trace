"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Lightbulb, TrendingUp, Shield } from "lucide-react"
import { DiversificationTip } from "@/types/correlation"
import { cn } from "@/lib/utils"

interface RiskInsightsProps {
    tips: DiversificationTip[]
}

export function RiskInsights({ tips }: RiskInsightsProps) {
    if (tips.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6 border-l-4 border-l-green-500/50"
            >
                <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-green-500/10">
                        <Shield className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-green-500">Well Diversified Portfolio</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            No high-correlation risks detected. Your holdings appear to be
                            spread across uncorrelated sectors and industries.
                        </p>
                    </div>
                </div>
            </motion.div>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                AI-Driven Risk Insights
            </h3>

            <AnimatePresence>
                {tips.map((tip, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn(
                            "glass rounded-xl p-5 border-l-4 space-y-3",
                            tip.severity === 'critical'
                                ? "border-l-red-500/70"
                                : "border-l-amber-500/70"
                        )}
                    >
                        {/* Warning Header */}
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "p-2 rounded-lg",
                                tip.severity === 'critical' ? "bg-red-500/10" : "bg-amber-500/10"
                            )}>
                                <AlertTriangle className={cn(
                                    "w-5 h-5",
                                    tip.severity === 'critical' ? "text-red-500" : "text-amber-500"
                                )} />
                            </div>
                            <div>
                                <h4 className={cn(
                                    "font-semibold",
                                    tip.severity === 'critical' ? "text-red-500" : "text-amber-500"
                                )}>
                                    {tip.severity === 'critical' ? 'Critical Risk Alert' : 'Correlation Warning'}
                                </h4>
                                <p className="text-sm text-foreground/80 mt-1">
                                    {tip.message}
                                </p>
                            </div>
                        </div>

                        {/* Affected Tickers */}
                        <div className="flex flex-wrap gap-2 pl-12">
                            {tip.tickers.slice(0, 6).map(ticker => (
                                <span
                                    key={ticker}
                                    className="px-2 py-1 text-xs font-mono rounded bg-secondary/50 border border-border/50"
                                >
                                    {ticker}
                                </span>
                            ))}
                            {tip.tickers.length > 6 && (
                                <span className="px-2 py-1 text-xs text-muted-foreground">
                                    +{tip.tickers.length - 6} more
                                </span>
                            )}
                        </div>

                        {/* Suggestion */}
                        <div className="flex items-start gap-3 pt-3 border-t border-border/30">
                            <div className="p-1.5 rounded-lg bg-cyan-500/10">
                                <Lightbulb className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div>
                                <span className="text-xs font-medium text-cyan-400">Diversification Tip</span>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {tip.suggestion}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
