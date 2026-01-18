"use client"

import * as React from "react"
import { motion } from "framer-motion"

export type RiskProfile = "conservative" | "moderate" | "aggressive"

interface RiskSelectorProps {
    selected: RiskProfile
    onSelect: (profile: RiskProfile) => void
}

export function RiskSelector({ selected, onSelect }: RiskSelectorProps) {
    const profiles: { id: RiskProfile; label: string; color: string }[] = [
        { id: "conservative", label: "Conservative", color: "bg-green-500" },
        { id: "moderate", label: "Moderate", color: "bg-yellow-500" },
        { id: "aggressive", label: "Aggressive", color: "bg-red-500" },
    ]

    return (
        <div className="flex bg-secondary/50 backdrop-blur-md p-1 rounded-xl border border-border/50 relative z-20">
            {profiles.map((profile) => {
                const isSelected = selected === profile.id
                return (
                    <button
                        key={profile.id}
                        onClick={() => onSelect(profile.id)}
                        className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-1 md:flex-none ${isSelected ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        {isSelected && (
                            <motion.div
                                layoutId="risk-pill"
                                className={`absolute inset-0 rounded-lg shadow-sm ${profile.color} opacity-90`}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                        )}
                        <span className="relative z-10">{profile.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
