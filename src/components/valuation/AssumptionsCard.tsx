"use client"

import * as React from "react"
import { RotateCcw, SlidersHorizontal } from "lucide-react"

import type { DcfAssumptions } from "@/lib/finance"
import { formatCompactCurrency, formatRate } from "@/lib/format"
import { Slider } from "@/components/ui/Slider"
import type { ValuationSnapshot } from "@/types/valuation"

interface AssumptionsCardProps {
    snapshot: ValuationSnapshot
    assumptions: Required<DcfAssumptions>
    onAssumptionsChange: (next: Required<DcfAssumptions>) => void
    freeCashFlow: number
    onFreeCashFlowChange: (next: number) => void
    onReset: () => void
    isModified: boolean
}

const BILLION = 1e9

/** Slider steps land on awkward binary fractions, so snap to four decimals. */
function snap(rate: number): number {
    return Math.round(rate * 1e4) / 1e4
}

export function AssumptionsCard({
    snapshot,
    assumptions,
    onAssumptionsChange,
    freeCashFlow,
    onFreeCashFlowChange,
    onReset,
    isModified,
}: AssumptionsCardProps) {
    const update = (patch: Partial<Required<DcfAssumptions>>) => {
        onAssumptionsChange({ ...assumptions, ...patch })
    }

    const fcfInBillions = React.useMemo(() => (freeCashFlow / BILLION).toFixed(2), [freeCashFlow])

    return (
        <div className="glass rounded-2xl p-5 space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <SlidersHorizontal className="w-4 h-4" />
                    Assumptions
                </div>
                {isModified && (
                    <button
                        onClick={onReset}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset
                    </button>
                )}
            </div>

            <div className="space-y-1.5">
                <label
                    htmlFor="fcf-override"
                    className="flex items-baseline justify-between gap-3"
                >
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Free Cash Flow
                    </span>
                    <span className="text-sm font-bold font-mono tabular-nums">
                        {formatCompactCurrency(freeCashFlow, snapshot.currency)}
                    </span>
                </label>
                <div className="relative">
                    <input
                        id="fcf-override"
                        type="number"
                        step="0.1"
                        value={fcfInBillions}
                        onChange={(event) => {
                            const parsed = Number(event.target.value)
                            if (Number.isFinite(parsed)) onFreeCashFlowChange(parsed * BILLION)
                        }}
                        className="w-full pl-3 pr-12 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">
                        billions
                    </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                    {snapshot.freeCashFlowBasis === "annual"
                        ? "Latest reported fiscal year."
                        : "Trailing twelve months, which can swing with capital spending."}
                </p>
            </div>

            <Slider
                label="Growth Rate (Years 1-5)"
                value={assumptions.growthRate}
                min={-0.1}
                max={0.4}
                step={0.005}
                onChange={(value) => update({ growthRate: snap(value) })}
                format={(value) => formatRate(value)}
                hint="Annual free cash flow growth"
                benchmark={snapshot.freeCashFlowGrowth}
                benchmarkLabel={
                    snapshot.freeCashFlowGrowth !== null
                        ? `Historic ${formatRate(snapshot.freeCashFlowGrowth, 0)}`
                        : undefined
                }
            />

            <Slider
                label="Discount Rate (WACC)"
                value={assumptions.discountRate}
                min={0.04}
                max={0.2}
                step={0.0025}
                onChange={(value) => update({ discountRate: snap(value) })}
                format={(value) => formatRate(value)}
                hint="Required annual return"
            />

            <Slider
                label="Terminal Growth Rate"
                value={assumptions.terminalGrowthRate}
                min={0}
                max={0.05}
                step={0.001}
                onChange={(value) => update({ terminalGrowthRate: snap(value) })}
                format={(value) => formatRate(value)}
                hint="Perpetual growth beyond year 5"
            />
        </div>
    )
}
