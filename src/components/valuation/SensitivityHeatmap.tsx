"use client"

import * as React from "react"
import { Grid3x3 } from "lucide-react"

import type { SensitivityMatrix } from "@/lib/finance"
import { formatCurrency, formatRate } from "@/lib/format"

interface SensitivityHeatmapProps {
    matrix: SensitivityMatrix
    currency: string
}

/**
 * Shade by margin of safety rather than raw fair value, so the colour answers
 * "is it cheap here?" instead of "is this number big?".
 */
function cellBackground(marginOfSafety: number | null): React.CSSProperties {
    if (marginOfSafety === null) return {}

    const intensity = Math.min(1, Math.abs(marginOfSafety) / 60) * 0.5 + 0.06
    const channel = marginOfSafety >= 0 ? "16, 185, 129" : "244, 63, 94"
    return { backgroundColor: `rgba(${channel}, ${intensity})` }
}

export function SensitivityHeatmap({ matrix, currency }: SensitivityHeatmapProps) {
    return (
        <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Grid3x3 className="w-4 h-4" />
                    Sensitivity
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-rose-500/50" />
                        Overvalued
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-emerald-500/50" />
                        Undervalued
                    </span>
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                Fair value per share as growth and discount rates move around your assumptions.
            </p>

            <div className="-mx-5 px-5 overflow-x-auto">
                <table className="w-full min-w-[34rem] border-separate border-spacing-1">
                    <caption className="sr-only">
                        Fair value per share by growth rate and discount rate
                    </caption>
                    <thead>
                        <tr>
                            <th
                                scope="col"
                                className="sticky left-0 z-10 bg-background/80 backdrop-blur-sm rounded-lg text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-left px-2 py-2"
                            >
                                WACC \ Growth
                            </th>
                            {matrix.growthRates.map((growthRate) => (
                                <th
                                    key={growthRate}
                                    scope="col"
                                    className={`px-2 py-2 rounded-lg text-xs font-mono font-semibold text-center ${
                                        growthRate === matrix.baseGrowthRate
                                            ? "bg-secondary text-foreground"
                                            : "text-muted-foreground"
                                    }`}
                                >
                                    {formatRate(growthRate)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix.rows.map((row, rowIndex) => {
                            const discountRate = matrix.discountRates[rowIndex]
                            return (
                                <tr key={discountRate}>
                                    <th
                                        scope="row"
                                        className={`sticky left-0 z-10 bg-background/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xs font-mono font-semibold text-left ${
                                            discountRate === matrix.baseDiscountRate
                                                ? "text-foreground"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        {formatRate(discountRate)}
                                    </th>

                                    {row.map((cell) => (
                                        <td
                                            key={`${cell.discountRate}-${cell.growthRate}`}
                                            style={cellBackground(cell.marginOfSafety)}
                                            className={`px-2 py-2.5 rounded-lg text-center text-xs font-mono tabular-nums transition-colors ${
                                                cell.isBase
                                                    ? "ring-2 ring-foreground/70 font-bold"
                                                    : "font-medium"
                                            }`}
                                        >
                                            {cell.fairValuePerShare === null ? (
                                                <span
                                                    className="text-muted-foreground/60"
                                                    title="The discount rate must exceed terminal growth"
                                                >
                                                    &mdash;
                                                </span>
                                            ) : (
                                                formatCurrency(cell.fairValuePerShare, currency, 0)
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
