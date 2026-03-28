export type SentimentHeadlinesSource = "alphavantage" | "synthetic_demo"
export type SentimentAnalysisSource = "openrouter" | "synthetic_demo" | "error_fallback"

export interface SentimentDataProvenance {
    headlinesSource: SentimentHeadlinesSource
    analysisSource: SentimentAnalysisSource
}

export interface SentimentResult {
    score: number // 0-100 (0 = extreme panic, 100 = extreme euphoria)
    label: 'Strong Bearish' | 'Bearish' | 'Neutral' | 'Bullish' | 'Strong Bullish'
    reason: string
    updatedAt: string // ISO timestamp
    headlines?: NewsHeadline[]
    /** How headlines and scores were produced (for UI disclosure) */
    dataProvenance?: SentimentDataProvenance
    /** True only when live news + LLM were both used successfully */
    isResearchGrade?: boolean
}

export interface NewsHeadline {
    title: string
    source: string
    publishedAt: string
    url?: string
}

export function getSentimentLabel(score: number): SentimentResult['label'] {
    if (score >= 80) return 'Strong Bullish'
    if (score >= 60) return 'Bullish'
    if (score >= 40) return 'Neutral'
    if (score >= 20) return 'Bearish'
    return 'Strong Bearish'
}

export function getSentimentColor(score: number): string {
    if (score >= 80) return '#22c55e' // bright green
    if (score >= 60) return '#4ade80' // soft green
    if (score >= 40) return '#6b7280' // gray
    if (score >= 20) return '#f97316' // orange
    return '#ef4444' // red
}
