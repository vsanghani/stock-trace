"use client"

import { Suspense } from "react"
import { motion } from "framer-motion"
import { Activity } from "lucide-react"
import { StressTestContainer } from "@/components/stress-test/StressTestContainer"

function StressTestInner() {
    return (
        <div className="container mx-auto px-4 py-8 min-h-screen">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
            >
                <div className="text-center space-y-4 mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 text-sm font-medium mb-4">
                        <Activity className="w-4 h-4" />
                        Portfolio Risk Analysis
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
                        Stress Test Engine
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Simulate how your portfolio would perform during historical market crashes
                        or hypothetical sector sell-offs. Add your holdings and run stress scenarios
                        to understand your risk exposure. The address bar updates as you edit so you
                        can bookmark or share a portfolio via the <code className="text-xs bg-secondary/80 px-1 py-0.5 rounded">?p=</code>{" "}
                        link.
                    </p>
                </div>

                <StressTestContainer />
            </motion.div>
        </div>
    )
}

export default function StressTestPage() {
    return (
        <Suspense
            fallback={
                <div className="container mx-auto px-4 py-16 min-h-screen text-center text-muted-foreground text-sm">
                    Loading stress test…
                </div>
            }
        >
            <StressTestInner />
        </Suspense>
    )
}
