"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { motion } from "framer-motion"
import { ExternalLink, Landmark, Loader2 } from "lucide-react"
import { HOLDERS_DELAY_NOTE, type HolderSource, type HoldersPayload } from "@/lib/holders/resolve"

interface HoldersPanelProps {
    ticker: string
}

const SOURCE_LABEL: Record<HolderSource, string> = {
    "13F": "13F",
    "13D": "13D",
    "13G": "13G",
    "4": "Form 4",
}

const SOURCE_CLASS: Record<HolderSource, string> = {
    "13F": "bg-blue-500/10 text-blue-500",
    "13D": "bg-green-500/10 text-green-500",
    "13G": "bg-green-500/10 text-green-500",
    "4": "bg-yellow-500/10 text-yellow-500",
}

export function HoldersPanel({ ticker }: HoldersPanelProps) {
    const [data, setData] = React.useState<HoldersPayload | null>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            try {
                const response = await fetch(`/api/holders/${encodeURIComponent(ticker)}`)
                if (!response.ok) {
                    if (!cancelled) setData({ ...emptyPayload(ticker), unavailable: true })
                    return
                }
                const json = (await response.json()) as HoldersPayload
                if (!cancelled) setData(json)
            } catch {
                if (!cancelled) setData({ ...emptyPayload(ticker), unavailable: true })
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [ticker])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass rounded-xl shadow-lg p-6 md:p-8 space-y-5"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">Major holders</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {data?.asOf ? `Institutional positions as of ${formatDate(data.asOf)}` : "SEC EDGAR filings"}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
            ) : (
                <HolderBody ticker={ticker} data={data} />
            )}

            <p className="text-xs text-muted-foreground/80 leading-relaxed pt-2 border-t border-border/30">
                {data?.note || HOLDERS_DELAY_NOTE}
            </p>
        </motion.div>
    )
}

function HolderBody({ ticker, data }: { ticker: string; data: HoldersPayload | null }) {
    if (!data || data.unavailable) {
        return <p className="text-sm text-muted-foreground">Holder filings are not connected yet.</p>
    }
    if (data.holders.length === 0) {
        return <p className="text-sm text-muted-foreground">No major-holder filings are loaded for {ticker} yet.</p>
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/70 text-muted-foreground border-b border-border">
                    <tr>
                        <th className="px-3 py-3">Holder</th>
                        <th className="px-3 py-3 text-right">Shares</th>
                        <th className="px-3 py-3 text-right">Value</th>
                        <th className="px-3 py-3">As of</th>
                        <th className="px-3 py-3">Source</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {data.holders.map((holder) => (
                        <tr key={`${holder.holderCik}-${holder.accessionNumber}`} className="hover:bg-muted/60 transition-colors">
                            <td className="px-3 py-3 font-medium">
                                <a
                                    href={holder.filingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 hover:text-primary"
                                >
                                    {holder.holderName}
                                    <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                                </a>
                                {holder.percentOfClass != null && (
                                    <div className="text-[11px] text-muted-foreground font-normal">
                                        {formatPercent(holder.percentOfClass)} of class
                                    </div>
                                )}
                            </td>
                            <td className="px-3 py-3 text-right font-mono">{formatShares(holder.shares)}</td>
                            <td className="px-3 py-3 text-right font-mono" title={exactUsd(holder.valueUsd)}>
                                {formatUsd(holder.valueUsd)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatDate(holder.asOf)}</td>
                            <td className="px-3 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SOURCE_CLASS[holder.source]}`}>
                                    {SOURCE_LABEL[holder.source]}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function emptyPayload(ticker: string): HoldersPayload {
    return {
        ticker,
        holders: [],
        asOf: null,
        count: 0,
        note: HOLDERS_DELAY_NOTE,
        unavailable: true,
    }
}

function formatDate(iso: string): string {
    try {
        return format(parseISO(iso), "MMM d, yyyy")
    } catch {
        return iso
    }
}

function formatShares(value: number | null): string {
    if (value == null) return "—"
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

function formatUsd(value: number | null): string {
    if (value == null) return "—"
    const absolute = Math.abs(value)
    const sign = value < 0 ? "-" : ""
    if (absolute >= 1e12) return `${sign}$${(absolute / 1e12).toFixed(2)}T`
    if (absolute >= 1e9) return `${sign}$${(absolute / 1e9).toFixed(2)}B`
    if (absolute >= 1e6) return `${sign}$${(absolute / 1e6).toFixed(2)}M`
    return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function exactUsd(value: number | null): string | undefined {
    if (value == null) return undefined
    return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function formatPercent(value: number): string {
    return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`
}
