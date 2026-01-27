"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { X, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import { format } from "date-fns"
import { usePnLStore, Trade } from "./usePnLStore"
import { TradeForm } from "./TradeForm"

interface DayDetailsProps {
    date: string
    onClose: () => void
}

export function DayDetails({ date, onClose }: DayDetailsProps) {
    const { getTradesByDate, deleteTrade } = usePnLStore()
    const trades = getTradesByDate(date)
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)

    // Calculate daily metrics
    const winCount = trades.filter(t => t.pnl > 0).length
    const lossCount = trades.filter(t => t.pnl <= 0).length

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            {format(new Date(date), "MMMM d, yyyy")}
                        </h2>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{trades.length} Trades</span>
                            <span>•</span>
                            <span className={totalPnL >= 0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                                {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary/50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Left Column: Trade List */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Today's Trades
                            </h3>

                            {trades.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground bg-secondary/20 rounded-xl border border-border/30 border-dashed">
                                    No trades recorded for this day.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {trades.map((trade) => (
                                        <div
                                            key={trade.id}
                                            className="group bg-secondary/10 border border-border/40 hover:border-border/80 rounded-xl p-3 transition-all"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="font-bold font-mono text-lg">{trade.ticker}</span>
                                                    <span className="text-xs text-muted-foreground ml-2 font-mono">x{trade.quantity}</span>
                                                </div>
                                                <button
                                                    onClick={() => deleteTrade(trade.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 text-sm gap-y-1 mb-2">
                                                <div className="text-muted-foreground">Buy: <span className="text-foreground font-mono">{trade.buyPrice}</span></div>
                                                <div className="text-muted-foreground text-right">Sell: <span className="text-foreground font-mono">{trade.sellPrice}</span></div>
                                            </div>

                                            <div className="flex justify-between items-center pt-2 border-t border-border/30">
                                                <span className="text-xs text-muted-foreground">
                                                    Fee: ${trade.fees}
                                                </span>
                                                <span className={`font-mono font-bold ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                                    {trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)}
                                                </span>
                                            </div>
                                            {trade.notes && (
                                                <div className="text-xs text-muted-foreground mt-2 italic border-t border-border/30 pt-1">
                                                    "{trade.notes}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Column: Add Trade Form */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Add New Trade</h3>
                            <div className="bg-secondary/10 border border-border/40 rounded-xl p-4">
                                <TradeForm date={date} onClose={onClose} />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
