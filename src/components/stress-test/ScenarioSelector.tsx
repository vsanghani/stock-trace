"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Calendar, TrendingDown, Zap } from "lucide-react"
import { StressScenario } from "@/types/stress-test"
import { STRESS_SCENARIOS } from "@/lib/stress-scenarios"
import { cn } from "@/lib/utils"

interface ScenarioSelectorProps {
    selectedId: string | null
    onSelect: (scenario: StressScenario) => void
}

export function ScenarioSelector({ selectedId, onSelect }: ScenarioSelectorProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                Select a Stress Scenario
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {STRESS_SCENARIOS.map((scenario) => {
                    const isSelected = selectedId === scenario.id
                    const drawdownPercent = Math.abs(scenario.marketDrawdown * 100)

                    return (
                        <motion.button
                            key={scenario.id}
                            onClick={() => onSelect(scenario)}
                            className={cn(
                                "relative text-left p-5 rounded-xl border transition-all duration-300",
                                "hover:scale-[1.02] active:scale-[0.98]",
                                isSelected
                                    ? "border-red-500/50 bg-red-500/10"
                                    : "border-border/50 bg-secondary/30 hover:border-border"
                            )}
                            style={{
                                boxShadow: isSelected
                                    ? "0 0 30px rgba(239, 68, 68, 0.2), inset 0 0 30px rgba(239, 68, 68, 0.05)"
                                    : undefined,
                            }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {/* Selection indicator */}
                            {isSelected && (
                                <motion.div
                                    layoutId="scenario-selection"
                                    className="absolute inset-0 border-2 border-red-500 rounded-xl"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}

                            <div className="relative space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-foreground">{scenario.name}</h3>
                                        {scenario.isHypothetical ? (
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                                                <Zap className="w-3 h-3" />
                                                Hypothetical
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <Calendar className="w-3 h-3" />
                                                {scenario.dateRange.start}
                                                {scenario.dateRange.end && ` – ${scenario.dateRange.end}`}
                                            </div>
                                        )}
                                    </div>

                                    {/* Drawdown badge */}
                                    <div className={cn(
                                        "text-xl font-mono font-bold",
                                        drawdownPercent >= 40 ? "text-red-500" :
                                            drawdownPercent >= 25 ? "text-orange-500" :
                                                "text-yellow-500"
                                    )}>
                                        -{drawdownPercent}%
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                    {scenario.description}
                                </p>
                            </div>
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}
