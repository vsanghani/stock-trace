"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Building2, Users, BarChart3, ExternalLink, Globe, MapPin, ChevronDown, ChevronUp, Briefcase } from "lucide-react"
import { StockData } from "@/types/stock"

interface CompanyInfoProps {
    data: StockData
}

export function CompanyInfo({ data }: CompanyInfoProps) {
    const [bioExpanded, setBioExpanded] = React.useState(false)
    const hasBio = !!data.longBusinessSummary
    const hasOfficers = data.companyOfficers && data.companyOfficers.length > 0
    const hasEarnings = data.quarterlyEarnings && data.quarterlyEarnings.length > 0

    if (!hasBio && !hasOfficers && !hasEarnings) return null

    const truncateLength = 300
    const shouldTruncate = hasBio && data.longBusinessSummary!.length > truncateLength

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-6"
        >
            {/* Company About Section */}
            {hasBio && (
                <div className="glass rounded-xl shadow-lg p-6 md:p-8 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">About {data.shortName}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                {data.sector && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/5 text-primary text-xs font-medium">
                                        <Briefcase className="w-3 h-3" />
                                        {data.sector}
                                    </span>
                                )}
                                {data.industry && (
                                    <span className="text-xs opacity-80">{data.industry}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="text-sm leading-relaxed text-foreground/80">
                        {shouldTruncate && !bioExpanded
                            ? data.longBusinessSummary!.slice(0, truncateLength) + "..."
                            : data.longBusinessSummary}
                    </div>

                    {shouldTruncate && (
                        <button
                            onClick={() => setBioExpanded(!bioExpanded)}
                            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            {bioExpanded ? (
                                <>Show less <ChevronUp className="w-3 h-3" /></>
                            ) : (
                                <>Read more <ChevronDown className="w-3 h-3" /></>
                            )}
                        </button>
                    )}

                    {/* Company metadata row */}
                    <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                        {data.city && data.country && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {data.city}, {data.country}
                            </span>
                        )}
                        {data.website && (
                            <a
                                href={data.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                            >
                                <Globe className="w-3 h-3" />
                                Website
                                <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                        )}
                        {data.fullTimeEmployees && (
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {data.fullTimeEmployees.toLocaleString()} employees
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Leadership Section */}
            {hasOfficers && (
                <div className="glass rounded-xl shadow-lg p-6 md:p-8 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-bold">Leadership & Senior Management</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.companyOfficers!.map((officer, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * i }}
                                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all group"
                            >
                                {/* Initials avatar */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center text-sm font-bold text-primary/80 shrink-0">
                                    {getInitials(officer.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors break-words">
                                        {officer.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground break-words">
                                        {officer.title}
                                    </p>
                                    {officer.age && (
                                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                            Age {officer.age}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quarterly Results Section */}
            {hasEarnings && (
                <div className="glass rounded-xl shadow-lg p-6 md:p-8 space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold">Quarterly Results</h3>
                        </div>
                        <a
                            href={`https://finance.yahoo.com/quote/${data.symbol}/financials/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10"
                        >
                            View on Yahoo Finance
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-white/5 text-muted-foreground border-b border-white/10">
                                <tr>
                                    <th className="px-4 py-3">Quarter</th>
                                    <th className="px-4 py-3 text-right">EPS Actual</th>
                                    <th className="px-4 py-3 text-right">EPS Estimate</th>
                                    <th className="px-4 py-3 text-right">Surprise</th>
                                    <th className="px-4 py-3 text-center">Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {data.quarterlyEarnings!.map((q, i) => {
                                    const surprise = q.actual !== null && q.estimate !== null
                                        ? q.actual - q.estimate
                                        : null
                                    const beat = surprise !== null ? surprise >= 0 : null

                                    return (
                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 font-medium font-mono">
                                                {q.date || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                {q.actual !== null ? q.actual.toFixed(2) : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                                                {q.estimate !== null ? q.estimate.toFixed(2) : 'N/A'}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-mono font-semibold ${beat === null ? '' : beat ? 'text-green-500' : 'text-red-500'}`}>
                                                {surprise !== null ? (surprise >= 0 ? '+' : '') + surprise.toFixed(2) : 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {beat === null ? (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                ) : beat ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500">
                                                        BEAT
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500">
                                                        MISS
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Source link */}
                    <div className="text-xs text-muted-foreground/60 pt-2 border-t border-border/30">
                        Source: Yahoo Finance —
                        <a
                            href={`https://finance.yahoo.com/quote/${data.symbol}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary/60 hover:text-primary transition-colors"
                        >
                            {data.symbol} Earnings
                        </a>
                    </div>
                </div>
            )}
        </motion.div>
    )
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
}
