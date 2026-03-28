"use client"

import { Suspense } from "react"
import { motion } from "framer-motion"
import { Grid3X3 } from "lucide-react"
import { CorrelationHeatmap } from "@/components/correlation/CorrelationHeatmap"

function CorrelationPageInner() {
    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                <div className="text-center space-y-4 mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-sm font-medium mb-4">
                        <Grid3X3 className="w-4 h-4" />
                        Pro-Level Analytics
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
                        Smart Correlation Heatmap
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Visualize how closely your portfolio holdings move in tandem. Identify hidden
                        concentration risks where you think you&apos;re diversified, but assets are actually
                        90%+ correlated. Bookmark or share a setup with the{" "}
                        <code className="text-xs bg-secondary/80 px-1 py-0.5 rounded">?p=</code> link in the address bar.
                    </p>
                </div>

                <CorrelationHeatmap />
            </motion.div>
        </div>
    )
}

export default function CorrelationPage() {
    return (
        <Suspense
            fallback={
                <div className="container mx-auto px-4 py-16 min-h-screen text-center text-muted-foreground text-sm">
                    Loading correlation tool…
                </div>
            }
        >
            <CorrelationPageInner />
        </Suspense>
    )
}
