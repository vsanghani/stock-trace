"use client"

import { motion } from "framer-motion"
import { Zap } from "lucide-react"
import { WhisperContainer } from "@/components/whisper/WhisperContainer"

export default function WhisperAlertsPage() {
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
                        <Zap className="w-4 h-4" />
                        Market Intelligence
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
                        Whisper Alerts
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Multi-variable logic alerts that filter out market noise. Conditions are evaluated in
                        this browser while Stock Trace is open—there is no server-side monitoring, email, or
                        push delivery yet. Keep the tab running and use{" "}
                        <span className="font-medium text-foreground/90">Check Alerts</span> to refresh evaluations.
                    </p>
                </div>

                {/* Main Content */}
                <WhisperContainer />
            </motion.div>
        </div>
    )
}
