"use client"

import { motion } from "framer-motion"
import { Grid3X3 } from "lucide-react"
import { CorrelationHeatmap } from "@/components/correlation/CorrelationHeatmap"

export default function CorrelationPage() {
    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                {/* Header */}
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
                        concentration risks where you think you're diversified, but assets are actually
                        90%+ correlated.
                    </p>
                </div>

                {/* Main Content */}
                <CorrelationHeatmap />
            </motion.div>
        </div>
    )
}
