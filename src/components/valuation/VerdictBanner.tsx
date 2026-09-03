"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { AlertTriangle, ArrowRight, Info } from "lucide-react"

import { VALUATION_MESSAGES, type DcfResult, type ValuationErrorCode } from "@/lib/finance"
import { formatCurrency, formatRate, formatSignedPercent } from "@/lib/format"
import type { ValuationSnapshot } from "@/types/valuation"

import { VERDICT_BADGE_STYLES, VERDICT_LABELS, VERDICT_TEXT_STYLES } from "./verdict"

interface VerdictBannerProps {
    snapshot: ValuationSnapshot
    result: DcfResult | null
    errors: ValuationErrorCode[]
}

const SOURCE_LABELS: Record<ValuationSnapshot["source"], string> = {
    yahoo: "Yahoo Finance",
    fmp: "Financial Modeling Prep",
    mock: "Sample data",
}

export function VerdictBanner({ snapshot, result, errors }: VerdictBannerProps) {
    if (!result) {
        return (
            <div className="glass rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    These assumptions cannot be solved
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {errors.map((code) => (
                        <li key={code}>{VALUATION_MESSAGES[code]}</li>
                    ))}
                </ul>
            </div>
        )
    }

    const { verdict, fairValuePerShare, marginOfSafety, currentPrice } = result

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 space-y-6"
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">{snapshot.companyName}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-sm font-mono font-semibold text-muted-foreground">
                            {snapshot.ticker}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-secondary/60 border border-border/50 text-muted-foreground">
                            {SOURCE_LABELS[snapshot.source]}
                        </span>
                        {snapshot.source === "mock" && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-400">
                                Not live
                            </span>
                        )}
                    </div>
                </div>

                <span
                    className={`px-4 py-2 rounded-xl border text-sm font-bold ${VERDICT_BADGE_STYLES[verdict]}`}
                >
                    {VERDICT_LABELS[verdict]}
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6">
                <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Current Price
                    </div>
                    <div className="text-3xl sm:text-4xl font-bold font-mono tabular-nums">
                        {formatCurrency(currentPrice, snapshot.currency)}
                    </div>
                </div>

                <ArrowRight className="hidden sm:block w-6 h-6 text-muted-foreground/50" />

                <div className="space-y-1 sm:text-right">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Intrinsic Value
                    </div>
                    <div
                        className={`text-3xl sm:text-4xl font-bold font-mono tabular-nums ${VERDICT_TEXT_STYLES[verdict]}`}
                    >
                        {formatCurrency(fairValuePerShare, snapshot.currency)}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 border-t border-border/50">
                <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Margin of Safety
                    </div>
                    <div
                        className={`text-2xl font-bold font-mono tabular-nums ${VERDICT_TEXT_STYLES[verdict]}`}
                    >
                        {formatSignedPercent(marginOfSafety)}
                    </div>
                </div>

                <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Terminal Value Share
                    </div>
                    <div className="text-2xl font-bold font-mono tabular-nums">
                        {formatRate(result.terminalValueWeight, 0)}
                    </div>
                </div>
            </div>

            {result.warnings.length > 0 && (
                <ul className="space-y-2 pt-2">
                    {result.warnings.map((code) => (
                        <li
                            key={code}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                            {VALUATION_MESSAGES[code]}
                        </li>
                    ))}
                </ul>
            )}
        </motion.div>
    )
}
