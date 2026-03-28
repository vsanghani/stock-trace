"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    Bell,
    Plus,
    Settings,
    Trash2,
    Power,
    PowerOff,
    Play,
    AlertCircle
} from "lucide-react"
import { WhisperAlert, EvaluationResult } from "@/types/whisper-alert"
import { evaluateWhisperAlert, createMockMarketData, generateAlertSentence } from "@/lib/whisper-evaluator"
import { useWhisperStore } from "./useWhisperStore"
import { WhisperAlertCreator } from "./WhisperAlertCreator"
import { WhisperNotification } from "./WhisperNotification"
import { cn } from "@/lib/utils"

export function WhisperContainer() {
    const {
        alerts,
        addAlert,
        deleteAlert,
        toggleAlert,
        markTriggered,
        resetTriggered,
        isLoaded
    } = useWhisperStore()

    const [showCreator, setShowCreator] = React.useState(false)
    const [evaluationResults, setEvaluationResults] = React.useState<Map<string, EvaluationResult>>(new Map())
    const [isSimulating, setIsSimulating] = React.useState(false)

    // Simulate checking alerts against market data
    const runSimulation = async () => {
        setIsSimulating(true)

        // Get all tickers from alerts
        const tickers = new Set<string>()
        alerts.forEach(alert => {
            alert.conditions.forEach(c => {
                if (c.ticker) tickers.add(c.ticker)
                if (c.comparisonTicker) tickers.add(c.comparisonTicker)
            })
        })

        // Create mock market data
        const marketData = createMockMarketData(Array.from(tickers))

        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Evaluate each alert
        const results = new Map<string, EvaluationResult>()
        alerts.forEach(alert => {
            if (alert.enabled) {
                const result = evaluateWhisperAlert(alert, marketData)
                results.set(alert.id, result)

                if (result.triggered && !alert.triggered) {
                    markTriggered(alert.id)
                }
            }
        })

        setEvaluationResults(results)
        setIsSimulating(false)
    }

    const handleSaveAlert = (alertData: Omit<WhisperAlert, "id" | "createdAt" | "triggered" | "triggerCount">) => {
        addAlert(alertData)
        setShowCreator(false)
    }

    if (!isLoaded) return null

    const enabledAlerts = alerts.filter(a => a.enabled)
    const disabledAlerts = alerts.filter(a => !a.enabled)
    const triggeredResults = Array.from(evaluationResults.entries())
        .filter(([, result]) => result.triggered)

    return (
        <div className="space-y-8">
            <div
                className="flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground"
                role="note"
            >
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-500/90" />
                <p>
                    Alerts run only in this browser session. Closing the tab stops checks; use{" "}
                    <span className="font-medium text-foreground/90">Check Alerts</span> for on-demand evaluation.
                    There is no background or off-device notification today.
                </p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowCreator(!showCreator)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                            showCreator
                                ? "bg-secondary text-secondary-foreground"
                                : "bg-gradient-to-r from-amber-600 to-orange-500 text-white hover:from-amber-500 hover:to-orange-400"
                        )}
                    >
                        <Plus className="w-4 h-4" />
                        {showCreator ? 'Cancel' : 'New Alert'}
                    </button>

                    {alerts.length > 0 && (
                        <button
                            onClick={runSimulation}
                            disabled={isSimulating || enabledAlerts.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                        >
                            <Play className="w-4 h-4" />
                            {isSimulating ? 'Checking...' : 'Check Alerts'}
                        </button>
                    )}
                </div>

                <div className="text-sm text-muted-foreground">
                    {enabledAlerts.length} active / {alerts.length} total
                </div>
            </div>

            {/* Alert Creator */}
            <AnimatePresence>
                {showCreator && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <WhisperAlertCreator
                            onSave={handleSaveAlert}
                            onCancel={() => setShowCreator(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Triggered Alerts */}
            {triggeredResults.length > 0 && (
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-amber-500">
                        <Bell className="w-5 h-5" />
                        Active Signals ({triggeredResults.length})
                    </h3>
                    <div className="space-y-3">
                        {triggeredResults.map(([alertId, result]) => {
                            const alert = alerts.find(a => a.id === alertId)
                            if (!alert) return null

                            return (
                                <WhisperNotification
                                    key={alertId}
                                    alert={alert}
                                    result={result}
                                    onDismiss={() => setEvaluationResults(prev => {
                                        const next = new Map(prev)
                                        next.delete(alertId)
                                        return next
                                    })}
                                    onReset={() => resetTriggered(alertId)}
                                    onViewChart={(ticker) => {
                                        // Could integrate with existing chart/search
                                        console.log('View chart for', ticker)
                                    }}
                                />
                            )
                        })}
                    </div>
                </section>
            )}

            {/* Alert List */}
            {alerts.length === 0 && !showCreator ? (
                <div className="glass rounded-xl p-12 text-center">
                    <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold mb-2">No Whisper Alerts Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Create your first alert to monitor market conditions. Use multi-variable
                        logic to filter out noise and get notified only when high-conviction conditions are met.
                    </p>
                </div>
            ) : alerts.length > 0 && (
                <section className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                        Your Alerts
                    </h3>

                    <div className="space-y-2">
                        {alerts.map(alert => (
                            <AlertListItem
                                key={alert.id}
                                alert={alert}
                                result={evaluationResults.get(alert.id)}
                                onToggle={() => toggleAlert(alert.id)}
                                onDelete={() => deleteAlert(alert.id)}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

/**
 * Compact list item for an alert
 */
function AlertListItem({
    alert,
    result,
    onToggle,
    onDelete,
}: {
    alert: WhisperAlert
    result?: EvaluationResult
    onToggle: () => void
    onDelete: () => void
}) {
    const sentence = generateAlertSentence(alert)

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-all",
                alert.enabled
                    ? "glass border-border/50"
                    : "bg-secondary/20 border-border/30 opacity-60"
            )}
        >
            {/* Toggle */}
            <button
                onClick={onToggle}
                className={cn(
                    "p-2 rounded-lg transition-colors",
                    alert.enabled
                        ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
            >
                {alert.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold truncate">{alert.name}</h4>
                    {alert.triggered && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-500">
                            Triggered
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground truncate font-mono">
                    {sentence}
                </p>
            </div>

            {/* Status indicator */}
            {result && (
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    result.triggered ? "bg-amber-500 animate-pulse" : "bg-secondary"
                )} />
            )}

            {/* Delete */}
            <button
                onClick={onDelete}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </motion.div>
    )
}
