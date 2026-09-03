"use client"

import * as React from "react"
import { Layers } from "lucide-react"

import type { DcfResult } from "@/lib/finance"
import { formatCompactCurrency, formatCurrency, formatCount } from "@/lib/format"
import type { ValuationSnapshot } from "@/types/valuation"

interface ValuationBreakdownProps {
    snapshot: ValuationSnapshot
    result: DcfResult
}

export function ValuationBreakdown({ snapshot, result }: ValuationBreakdownProps) {
    const { currency } = snapshot

    const bridge: Array<{ label: string; value: string; emphasis?: boolean }> = [
        {
            label: "Present value of years 1-5",
            value: formatCompactCurrency(result.pvOfCashFlows, currency),
        },
        {
            label: "Present value of terminal value",
            value: formatCompactCurrency(result.pvOfTerminalValue, currency),
        },
        {
            label: "Enterprise value",
            value: formatCompactCurrency(result.enterpriseValue, currency),
            emphasis: true,
        },
        {
            label: snapshot.netDebt >= 0 ? "Less net debt" : "Plus net cash",
            value: formatCompactCurrency(-snapshot.netDebt, currency),
        },
        {
            label: "Equity value",
            value: formatCompactCurrency(result.equityValue, currency),
            emphasis: true,
        },
        {
            label: "Shares outstanding",
            value: formatCount(snapshot.sharesOutstanding),
        },
        {
            label: "Fair value per share",
            value: formatCurrency(result.fairValuePerShare, currency),
            emphasis: true,
        },
    ]

    return (
        <div className="glass rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="w-4 h-4" />
                Breakdown
            </div>

            <div className="-mx-5 px-5 overflow-x-auto">
                <table className="w-full min-w-[26rem] text-sm">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th scope="col" className="text-left font-medium pb-2">
                                Year
                            </th>
                            <th scope="col" className="text-right font-medium pb-2">
                                Projected FCF
                            </th>
                            <th scope="col" className="text-right font-medium pb-2">
                                Discount
                            </th>
                            <th scope="col" className="text-right font-medium pb-2">
                                Present Value
                            </th>
                        </tr>
                    </thead>
                    <tbody className="font-mono tabular-nums">
                        {result.projections.map((projection) => (
                            <tr key={projection.year} className="border-t border-border/40">
                                <td className="py-2 text-muted-foreground">{projection.year}</td>
                                <td className="py-2 text-right">
                                    {formatCompactCurrency(projection.freeCashFlow, currency)}
                                </td>
                                <td className="py-2 text-right text-muted-foreground">
                                    {projection.discountFactor.toFixed(3)}
                                </td>
                                <td className="py-2 text-right font-semibold">
                                    {formatCompactCurrency(projection.presentValue, currency)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <dl className="space-y-2 pt-4 border-t border-border/50">
                {bridge.map((row) => (
                    <div key={row.label} className="flex items-baseline justify-between gap-4">
                        <dt
                            className={`text-xs ${row.emphasis ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                        >
                            {row.label}
                        </dt>
                        <dd
                            className={`font-mono tabular-nums text-right ${row.emphasis ? "text-sm font-bold" : "text-xs text-muted-foreground"}`}
                        >
                            {row.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    )
}
