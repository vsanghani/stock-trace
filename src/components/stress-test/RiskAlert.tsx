"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, Shield, TrendingUp, Info } from "lucide-react"
import { Vulnerability } from "@/types/stress-test"
import { cn } from "@/lib/utils"

interface RiskAlertProps {
    vulnerabilities: Vulnerability[]
}

const severityConfig = {
    high: {
        color: "text-red-500",
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        icon: AlertTriangle,
    },
    medium: {
        color: "text-orange-500",
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        icon: AlertTriangle,
    },
    low: {
        color: "text-yellow-500",
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        icon: Info,
    },
}

export function RiskAlert({ vulnerabilities }: RiskAlertProps) {
    if (vulnerabilities.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6 border-l-4 border-l-green-500/50"
            >
                <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-green-500/10">
                        <Shield className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-green-500">Portfolio Looks Balanced</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            No significant concentration risks detected. Your portfolio appears
                            well-diversified across sectors and holdings.
                        </p>
                    </div>
                </div>
            </motion.div>
        )
    }

    // Calculate overall risk score
    const riskScore = vulnerabilities.reduce((score, v) => {
        if (v.severity === 'high') return score + 3
        if (v.severity === 'medium') return score + 2
        return score + 1
    }, 0)

    const overallRisk = riskScore >= 6 ? 'High' : riskScore >= 3 ? 'Medium' : 'Low'
    const overallConfig = severityConfig[overallRisk.toLowerCase() as keyof typeof severityConfig]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "glass rounded-xl p-6 border-l-4",
                overallConfig.border.replace('/30', '/50')
            )}
        >
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className={cn("p-2 rounded-lg", overallConfig.bg)}>
                            <AlertTriangle className={cn("w-5 h-5", overallConfig.color)} />
                        </div>
                        <div>
                            <h3 className={cn("font-semibold", overallConfig.color)}>
                                Risk Assessment: {overallRisk}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {vulnerabilities.length} vulnerability{vulnerabilities.length !== 1 ? 'ies' : 'y'} detected
                            </p>
                        </div>
                    </div>

                    {/* Risk Score */}
                    <div className="text-right">
                        <div className={cn(
                            "text-3xl font-mono font-bold",
                            overallConfig.color
                        )}>
                            {riskScore}
                        </div>
                        <div className="text-xs text-muted-foreground">Risk Score</div>
                    </div>
                </div>

                {/* Vulnerabilities List */}
                <div className="space-y-3">
                    <AnimatePresence>
                        {vulnerabilities.map((vuln, i) => {
                            const config = severityConfig[vuln.severity]
                            const Icon = config.icon

                            return (
                                <motion.div
                                    key={`${vuln.type}-${i}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={cn(
                                        "p-4 rounded-lg border",
                                        config.bg,
                                        config.border
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", config.color)} />
                                        <div className="space-y-1">
                                            <p className={cn("font-medium text-sm", config.color)}>
                                                {vuln.message}
                                            </p>
                                            {vuln.details && (
                                                <p className="text-xs text-muted-foreground">
                                                    {vuln.details}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>

                {/* Recommendations */}
                <div className="pt-4 border-t border-border/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-medium">Quick Tip:</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {overallRisk === 'High'
                            ? "Consider rebalancing to reduce concentration. Add defensive sectors like Utilities or Consumer Staples."
                            : overallRisk === 'Medium'
                                ? "Your portfolio has some vulnerabilities. Consider diversifying across more sectors."
                                : "Minor improvements could enhance stability. Review individual position sizes."
                        }
                    </p>
                </div>
            </div>
        </motion.div>
    )
}
