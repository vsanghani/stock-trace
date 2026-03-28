"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, AlertTriangle } from "lucide-react"
import { SentimentResult, getSentimentColor } from "@/types/sentiment"
import { cn } from "@/lib/utils"

interface SentimentBadgeProps {
    ticker: string
    className?: string
}

export function SentimentBadge({ ticker, className }: SentimentBadgeProps) {
    const [sentiment, setSentiment] = React.useState<SentimentResult | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [isHovered, setIsHovered] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        async function fetchSentiment() {
            setIsLoading(true)
            setError(null)
            try {
                const response = await fetch(`/api/sentiment/${encodeURIComponent(ticker)}`)
                if (!response.ok) throw new Error('Failed to fetch sentiment')
                const data = await response.json()
                setSentiment(data)
            } catch (err) {
                setError('Unable to load sentiment')
                console.error('Sentiment fetch error:', err)
            } finally {
                setIsLoading(false)
            }
        }

        if (ticker) {
            fetchSentiment()
        }
    }, [ticker])

    // Check if sentiment was updated within the last 60 minutes
    const isRecent = React.useMemo(() => {
        if (!sentiment?.updatedAt) return false
        const updatedTime = new Date(sentiment.updatedAt).getTime()
        const now = Date.now()
        return now - updatedTime < 60 * 60 * 1000 // 60 minutes
    }, [sentiment?.updatedAt])

    if (isLoading) {
        return (
            <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-secondary/50 backdrop-blur-md border border-border/50",
                className
            )}>
                <div className="w-3 h-3 rounded-full bg-muted-foreground/50 animate-pulse" />
                <span className="font-mono text-sm text-muted-foreground">Loading...</span>
            </div>
        )
    }

    if (error || !sentiment) {
        return (
            <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-secondary/50 backdrop-blur-md border border-border/50",
                className
            )}>
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{error || 'No data'}</span>
            </div>
        )
    }

    const color = getSentimentColor(sentiment.score)
    const glowColor = `${color}40` // 25% opacity for glow

    const showDemoBanner = sentiment.isResearchGrade !== true

    return (
        <motion.div
            className={cn("relative inline-flex flex-col items-start gap-2", className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            layout
        >
            {showDemoBanner && (
                <div
                    className="flex items-start gap-2 max-w-md rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90"
                    role="status"
                >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                        <span className="font-semibold text-amber-100">Demo / not live research.</span>{" "}
                        Headlines or scoring are synthetic or degraded (missing API keys or upstream errors).
                        Do not use for trading or publication.
                    </span>
                </div>
            )}
            <motion.div
                className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer overflow-hidden self-start"
                style={{
                    background: 'rgba(10, 10, 12, 0.7)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: `1px solid ${color}`,
                    boxShadow: `0 0 20px ${glowColor}, inset 0 0 20px ${glowColor}`,
                }}
                layout
                animate={{
                    width: 'auto',
                }}
                transition={{
                    layout: { duration: 0.3, ease: "easeInOut" }
                }}
            >
                {/* Pulse indicator for recent updates */}
                {isRecent && (
                    <span className="relative flex h-2 w-2">
                        <span
                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                            style={{ backgroundColor: color }}
                        />
                        <span
                            className="relative inline-flex rounded-full h-2 w-2"
                            style={{ backgroundColor: color }}
                        />
                    </span>
                )}

                {/* Score with monospace font */}
                <span
                    className="font-mono text-sm font-bold tracking-tight"
                    style={{ color }}
                >
                    {sentiment.score}
                </span>

                {/* Divider */}
                <div className="w-px h-4 bg-border/50" />

                {/* Label */}
                <span
                    className="text-sm font-medium whitespace-nowrap"
                    style={{ color }}
                >
                    {sentiment.label}
                </span>

                {/* Expanded reason on hover */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center overflow-hidden"
                        >
                            <div className="w-px h-4 bg-border/50 mx-2" />
                            <span className="text-xs text-muted-foreground max-w-[250px] whitespace-nowrap overflow-hidden text-ellipsis">
                                {sentiment.reason}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Tooltip for full reason on mobile / small screens */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 mt-2 p-3 rounded-lg z-50 hidden sm:block"
                        style={{
                            background: 'rgba(10, 10, 12, 0.9)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            maxWidth: '300px',
                        }}
                    >
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {sentiment.reason}
                        </p>
                        {sentiment.dataProvenance && (
                            <p className="text-[10px] text-muted-foreground/70 mt-2 font-mono">
                                News: {sentiment.dataProvenance.headlinesSource} · Model:{" "}
                                {sentiment.dataProvenance.analysisSource}
                            </p>
                        )}
                        {sentiment.updatedAt && (
                            <p className="text-xs text-muted-foreground/60 mt-2">
                                Updated: {new Date(sentiment.updatedAt).toLocaleTimeString()}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
