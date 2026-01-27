"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { CalendarView } from "@/components/pnl/CalendarView"
import { usePnLStore } from "@/components/pnl/usePnLStore"

export default function PnLCalculatorPage() {
    const { getTotalPnL, isLoaded } = usePnLStore()

    // Prevent hydration mismatch by waiting for load
    if (!isLoaded) return null

    const totalPnL = getTotalPnL()

    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
                        PnL Calculator
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Track your daily trading performance. Click on any date to log your trades.
                    </p>

                    <div className="inline-flex items-center gap-4 bg-secondary/30 backdrop-blur-md px-6 py-3 rounded-full border border-border/50 mt-4">
                        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Total Net PnL
                        </span>
                        <span className={`text-2xl font-bold font-mono ${totalPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
                        </span>
                    </div>
                </div>

                <CalendarView />
            </motion.div>
        </div>
    )
}
