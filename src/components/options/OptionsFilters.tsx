"use client"

import * as React from "react"
import { Calendar, DollarSign, Filter } from "lucide-react"

interface OptionsFiltersProps {
    expirationDates: string[]
    selectedExpiry: string
    onExpiryChange: (expiry: string) => void
    minStrike: string
    maxStrike: string
    onMinStrikeChange: (val: string) => void
    onMaxStrikeChange: (val: string) => void
    itmOnly: boolean
    onItmToggle: (val: boolean) => void
}

export function OptionsFilters({
    expirationDates,
    selectedExpiry,
    onExpiryChange,
    minStrike,
    maxStrike,
    onMinStrikeChange,
    onMaxStrikeChange,
    itmOnly,
    onItmToggle,
}: OptionsFiltersProps) {
    return (
        <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <Filter className="w-4 h-4" />
                Filters
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Expiry Date */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <Calendar className="w-3.5 h-3.5" />
                        Expiration
                    </label>
                    <select
                        value={selectedExpiry}
                        onChange={(e) => onExpiryChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                    >
                        {expirationDates.map((d) => {
                            const date = new Date(d)
                            return (
                                <option key={d} value={d}>
                                    {date.toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </option>
                            )
                        })}
                    </select>
                </div>

                {/* Min Strike */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <DollarSign className="w-3.5 h-3.5" />
                        Min Strike
                    </label>
                    <input
                        type="number"
                        placeholder="No min"
                        value={minStrike}
                        onChange={(e) => onMinStrikeChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                    />
                </div>

                {/* Max Strike */}
                <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <DollarSign className="w-3.5 h-3.5" />
                        Max Strike
                    </label>
                    <input
                        type="number"
                        placeholder="No max"
                        value={maxStrike}
                        onChange={(e) => onMaxStrikeChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
                    />
                </div>

                {/* ITM Toggle */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Contract Type
                    </label>
                    <button
                        onClick={() => onItmToggle(!itmOnly)}
                        className={`w-full px-3 py-2 rounded-xl border text-sm font-medium transition-all ${itmOnly
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                : "bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        {itmOnly ? "✓  ITM Only" : "All Contracts"}
                    </button>
                </div>
            </div>
        </div>
    )
}
