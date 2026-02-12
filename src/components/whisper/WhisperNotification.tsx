"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Bell,
    TrendingUp,
    TrendingDown,
    X,
    ExternalLink,
    RefreshCw,
    Clock
} from "lucide-react"
import {
    WhisperAlert,
    EvaluationResult,
    PRIORITY_COLORS,
    PRIORITY_BG,
} from "@/types/whisper-alert"
import { cn } from "@/lib/utils"

interface WhisperNotificationProps {
    alert: WhisperAlert
    result: EvaluationResult
    onDismiss?: () => void
    onReset?: () => void
    onViewChart?: (ticker: string) => void
}

export function WhisperNotification({
    alert,
    result,
    onDismiss,
    onReset,
    onViewChart,
}: WhisperNotificationProps) {
    const timeAgo = alert.lastTriggeredAt
        ? getTimeAgo(new Date(alert.lastTriggeredAt))
        : 'Just now'

    // Get primary ticker from conditions
    const primaryTicker = alert.conditions[0]?.ticker || 'N/A'

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
                "relative glass rounded-xl border overflow-hidden",
                result.triggered
                    ? "border-amber-500/50 shadow-lg shadow-amber-500/10"
                    : "border-border/50"
            )}
        >
            {/* Neon glow effect when triggered */}
            {result.triggered && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/10 to-amber-500/5"
                    animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
            )}

            <div className="relative p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn(
                            "p-2 rounded-lg",
                            result.triggered ? "bg-amber-500/20" : "bg-secondary"
                        )}>
                            <Bell className={cn(
                                "w-5 h-5",
                                result.triggered ? "text-amber-500" : "text-muted-foreground"
                            )} />
                        </div>

                        {/* Title & Status */}
                        <div>
                            <h3 className="font-semibold text-foreground">
                                {alert.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    PRIORITY_BG[alert.priority],
                                    PRIORITY_COLORS[alert.priority]
                                )}>
                                    {alert.priority.toUpperCase()}
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {timeAgo}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dismiss button */}
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Summary */}
                <div className={cn(
                    "mt-4 p-3 rounded-lg",
                    result.triggered ? "bg-amber-500/10" : "bg-secondary/50"
                )}>
                    <p className={cn(
                        "text-sm font-medium",
                        result.triggered ? "text-amber-400" : "text-muted-foreground"
                    )}>
                        {result.summary}
                    </p>
                </div>

                {/* Condition Details */}
                <div className="mt-4 space-y-2">
                    {result.conditionResults.map((condition, i) => (
                        <div
                            key={condition.conditionId}
                            className="flex items-center justify-between text-sm"
                        >
                            <span className="text-muted-foreground truncate flex-1">
                                {condition.description}
                            </span>
                            <span className={cn(
                                "ml-2 font-mono text-xs px-2 py-0.5 rounded",
                                condition.met
                                    ? "bg-green-500/10 text-green-500"
                                    : "bg-red-500/10 text-red-500"
                            )}>
                                {condition.met ? '✓ MET' : '✗ NOT MET'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="mt-5 flex items-center gap-2">
                    {onViewChart && (
                        <button
                            onClick={() => onViewChart(primaryTicker)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View {primaryTicker} Chart
                        </button>
                    )}

                    {alert.notifyOnce && alert.triggered && onReset && (
                        <button
                            onClick={onReset}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Reset Alert
                        </button>
                    )}
                </div>

                {/* Trigger Count Badge */}
                {alert.triggerCount > 0 && (
                    <div className="absolute top-3 right-12 text-xs text-muted-foreground">
                        Triggered {alert.triggerCount}x
                    </div>
                )}
            </div>
        </motion.div>
    )
}

/**
 * Simple time ago formatter
 */
function getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}
