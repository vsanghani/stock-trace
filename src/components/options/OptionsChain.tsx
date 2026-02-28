"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react"
import type { OptionContract } from "@/types/options"

interface OptionsChainProps {
    contracts: OptionContract[]
    type: "calls" | "puts"
    currentPrice: number
}

type SortKey = "strike" | "lastPrice" | "change" | "bid" | "ask" | "volume" | "openInterest" | "impliedVolatility"
type SortDir = "asc" | "desc"

export function OptionsChain({ contracts, type, currentPrice }: OptionsChainProps) {
    const [sortKey, setSortKey] = React.useState<SortKey>("strike")
    const [sortDir, setSortDir] = React.useState<SortDir>("asc")

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        } else {
            setSortKey(key)
            setSortDir("asc")
        }
    }

    const sorted = React.useMemo(() => {
        return [...contracts].sort((a, b) => {
            const aVal = a[sortKey] ?? 0
            const bVal = b[sortKey] ?? 0
            return sortDir === "asc"
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number)
        })
    }, [contracts, sortKey, sortDir])

    const columns: { key: SortKey; label: string; format: (v: OptionContract) => React.ReactNode }[] = [
        {
            key: "strike",
            label: "Strike",
            format: (c) => {
                const diff = ((c.strike - currentPrice) / currentPrice) * 100
                return (
                    <div className="flex items-center gap-2">
                        <span className="font-semibold font-mono">${c.strike.toFixed(2)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.inTheMoney
                                ? type === "calls"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                : "bg-secondary/80 text-muted-foreground"
                            }`}>
                            {c.inTheMoney ? "ITM" : "OTM"} {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                        </span>
                    </div>
                )
            },
        },
        {
            key: "lastPrice",
            label: "Last",
            format: (c) => <span className="font-mono">${c.lastPrice.toFixed(2)}</span>,
        },
        {
            key: "change",
            label: "Change",
            format: (c) => (
                <span className={`font-mono flex items-center gap-1 ${c.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {c.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {c.change >= 0 ? "+" : ""}{c.change.toFixed(2)}
                    {c.percentChange !== undefined && (
                        <span className="text-[10px] ml-0.5">
                            ({c.percentChange >= 0 ? "+" : ""}{c.percentChange.toFixed(1)}%)
                        </span>
                    )}
                </span>
            ),
        },
        {
            key: "bid",
            label: "Bid",
            format: (c) => <span className="font-mono text-muted-foreground">${(c.bid ?? 0).toFixed(2)}</span>,
        },
        {
            key: "ask",
            label: "Ask",
            format: (c) => <span className="font-mono text-muted-foreground">${(c.ask ?? 0).toFixed(2)}</span>,
        },
        {
            key: "volume",
            label: "Volume",
            format: (c) => (
                <span className="font-mono">
                    {(c.volume ?? 0).toLocaleString()}
                </span>
            ),
        },
        {
            key: "openInterest",
            label: "Open Int",
            format: (c) => (
                <span className="font-mono">
                    {(c.openInterest ?? 0).toLocaleString()}
                </span>
            ),
        },
        {
            key: "impliedVolatility",
            label: "IV",
            format: (c) => {
                const iv = (c.impliedVolatility * 100)
                return (
                    <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${iv > 80
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            : iv > 50
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}>
                        {iv.toFixed(1)}%
                    </span>
                )
            },
        },
    ]

    if (contracts.length === 0) {
        return (
            <div className="glass rounded-2xl p-12 text-center">
                <p className="text-muted-foreground">No {type} contracts match your filters.</p>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-2xl overflow-hidden"
        >
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border/50">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => toggleSort(col.key)}
                                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                                >
                                    <span className="flex items-center gap-1">
                                        {col.label}
                                        <ArrowUpDown className={`w-3 h-3 transition-opacity ${sortKey === col.key ? "opacity-100" : "opacity-30"}`} />
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((contract, i) => (
                            <motion.tr
                                key={contract.contractSymbol}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: Math.min(i * 0.01, 0.5) }}
                                className={`border-b border-border/20 transition-colors hover:bg-foreground/[0.03] ${contract.inTheMoney
                                        ? type === "calls"
                                            ? "bg-emerald-500/[0.03]"
                                            : "bg-rose-500/[0.03]"
                                        : ""
                                    }`}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                                        {col.format(contract)}
                                    </td>
                                ))}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-4 py-2.5 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                <span>{sorted.length} contract{sorted.length !== 1 ? "s" : ""}</span>
                <span>Sorted by {columns.find(c => c.key === sortKey)?.label} ({sortDir === "asc" ? "↑" : "↓"})</span>
            </div>
        </motion.div>
    )
}
