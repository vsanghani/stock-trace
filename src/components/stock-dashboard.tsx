"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowDown, ArrowUp, Download, Loader2, Gauge } from "lucide-react"
import { StockData } from "@/types/stock"
import { RiskProfile } from "./risk-selector"

interface StockDashboardProps {
    ticker: string
    riskProfile: RiskProfile
}

export function StockDashboard({ ticker, riskProfile }: StockDashboardProps) {
    const [data, setData] = React.useState<StockData | null>(null)
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(`/api/stock?ticker=${encodeURIComponent(ticker)}`)
                const json = await res.json()

                if (!res.ok) {
                    throw new Error(json.error || 'Failed to fetch data')
                }

                setData(json)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        if (ticker) {
            fetchData()
        }
    }, [ticker])

    const handleExport = () => {
        if (!data) return

        const content = `STOCK ANALYSIS REPORT: ${data.symbol}
Generated on: ${new Date().toLocaleString()}
Risk Profile: ${riskProfile.toUpperCase()}
Risk Score: ${calculateRiskScore(data.beta)}/10
Recommendation: ${getRecommendation(data.beta, riskProfile).action}

-- MARKET DATA --
Price: ${formatCurrency(data.regularMarketPrice, data.currency)}
Change: ${data.regularMarketChangePercent?.toFixed(2)}%
Market Cap: ${formatLargeNumber(data.marketCap)}
Beta: ${data.beta?.toFixed(2) || 'N/A'}
Open: ${formatCurrency(data.regularMarketOpen, data.currency)}
High: ${formatCurrency(data.regularMarketDayHigh, data.currency)}
Low: ${formatCurrency(data.regularMarketDayLow, data.currency)}
52W High: ${formatCurrency(data.fiftyTwoWeekHigh, data.currency)}
52W Low: ${formatCurrency(data.fiftyTwoWeekLow, data.currency)}
Dividend Rate: ${data.dividendRate || 'N/A'}
Dividend Yield: ${data.dividendYield ? (data.dividendYield * 100).toFixed(2) + '%' : 'N/A'}

-- RATIO ANALYSIS --
P/E Ratio: ${data.trailingPE?.toFixed(2) || 'N/A'}
P/B Ratio: ${data.priceToBook?.toFixed(2) || 'N/A'}
Debt/Equity: ${data.debtToEquity?.toFixed(2) || 'N/A'}
ROE: ${data.returnOnEquity ? (data.returnOnEquity * 100).toFixed(2) + '%' : 'N/A'}
Current Ratio: ${data.currentRatio?.toFixed(2) || 'N/A'}
`
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${data.symbol}_Analysis.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Risk Calculation Logic
    const calculateRiskScore = (beta?: number) => {
        if (beta === undefined || beta === null) return 5 // Default if unknown
        // Beta 1 is market average. Scale roughy: 0.5 -> 2, 1 -> 5, 2 -> 10
        const score = Math.min(10, Math.max(0, beta * 5))
        return Math.round(score * 10) / 10
    }

    const getRecommendation = (beta: number | undefined, profile: RiskProfile) => {
        const score = calculateRiskScore(beta)

        // Risk bands
        const isLowRisk = score <= 4
        const isModRisk = score > 4 && score <= 7
        const isHighRisk = score > 7

        if (profile === 'conservative') {
            if (isLowRisk) return { action: "BUY", reason: "Matches your conservative profile with lower volatility.", color: "text-green-500" }
            if (isModRisk) return { action: "HOLD", reason: "Slightly higher risk than your preference.", color: "text-yellow-500" }
            return { action: "AVOID", reason: "Too volatile for a conservative strategy.", color: "text-red-500" }
        }

        if (profile === 'moderate') {
            if (isLowRisk) return { action: "BUY", reason: "Safe foundation for your portfolio.", color: "text-green-500" }
            if (isModRisk) return { action: "BUY", reason: "Aligns perfectly with balanced growth.", color: "text-green-500" }
            return { action: "HOLD", reason: "Higher volatility, proceed with caution.", color: "text-yellow-500" }
        }

        if (profile === 'aggressive') {
            if (isHighRisk) return { action: "BUY", reason: "High volatility fits your growth targets.", color: "text-green-500" }
            return { action: "BUY/HOLD", reason: "Lower risk/return than your aggressive target.", color: "text-yellow-500" }
        }

        return { action: "N/A", reason: "Insufficient data", color: "text-gray-500" }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-destructive/10 text-destructive rounded-xl glass">
                <p>Error: {error}</p>
                <p className="text-sm mt-2">Please try searching for a valid ticker (e.g. AAPL, MSFT, BHP.AX)</p>
            </div>
        )
    }

    if (!data) return null

    const isPositive = (data.regularMarketChangePercent || 0) >= 0
    const riskScore = calculateRiskScore(data.beta)
    const recommendation = getRecommendation(data.beta, riskProfile)

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl mx-auto space-y-8 pb-12"
        >
            {/* Header Section */}
            <div className="glass rounded-xl shadow-lg p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-bold tracking-tight">{data.symbol}</h2>
                    <p className="text-muted-foreground text-lg">{data.shortName}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="text-4xl font-mono font-bold">
                        {formatCurrency(data.regularMarketPrice, data.currency)}
                    </div>
                    <div className={`flex items-center gap-1 text-lg font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                        {Math.abs(data.regularMarketChangePercent || 0).toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Market Cap" value={formatLargeNumber(data.marketCap)} />
                <StatCard label="Beta (Risk)" value={data.beta?.toFixed(2) || 'N/A'} />
                <StatCard label="52W High" value={formatCurrency(data.fiftyTwoWeekHigh, data.currency)} />
                <StatCard label="52W Low" value={formatCurrency(data.fiftyTwoWeekLow, data.currency)} />
                <StatCard label="Dividend" value={data.dividendRate || 'N/A'} />
                <StatCard label="Yield" value={data.dividendYield ? (data.dividendYield * 100).toFixed(2) + '%' : 'N/A'} />
                <StatCard label="P/E Ratio" value={data.trailingPE?.toFixed(2) || 'N/A'} />
                <StatCard label="EPS" value={data.trailingPE ? ((data.regularMarketPrice || 0) / data.trailingPE).toFixed(2) : 'N/A'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Risk & Recommendation Engine */}
                <div className="lg:col-span-1 glass rounded-xl shadow-lg p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Gauge className="w-5 h-5" /> Risk Profile Analysis</h3>

                    {/* Speedometer Visual */}
                    <div className="relative w-48 h-24 overflow-hidden mt-4">
                        <div className="absolute inset-0 bg-secondary rounded-t-full"></div>
                        <motion.div
                            initial={{ rotate: -90 }}
                            animate={{ rotate: -90 + (Math.min(riskScore, 10) / 10) * 180 }}
                            transition={{ duration: 1, type: "spring" }}
                            className="absolute bottom-0 left-1/2 w-full h-2 bg-foreground origin-left"
                            style={{ marginLeft: "-50%", width: "50%" }}
                        />
                        <div className="absolute bottom-0 left-0 w-full h-full flex justify-between items-end px-4 pb-2 z-10 text-xs font-bold text-muted-foreground">
                            <span className="text-green-500">Low</span>
                            <span className="text-yellow-500">Mod</span>
                            <span className="text-red-500">High</span>
                        </div>
                    </div>
                    <div className="text-3xl font-bold font-mono">{riskScore}<span className="text-base text-muted-foreground">/10</span></div>

                    <div className="w-full pt-4 border-t border-border">
                        <p className="text-sm text-muted-foreground mb-1">Recommendation for {riskProfile.toUpperCase()}</p>
                        <div className={`text-2xl font-black ${recommendation.color}`}>{recommendation.action}</div>
                        <p className="text-sm mt-2 opacity-80">{recommendation.reason}</p>
                    </div>
                </div>

                {/* Ratio Analysis Section */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold">Financial Ratios</h3>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            Export Analysis
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RatioCard title="Price to Book" value={data.priceToBook?.toFixed(2)} description="Market value relative to book value." />
                        <RatioCard title="Debt to Equity" value={data.debtToEquity?.toFixed(2)} description="Proportion of equity and debt used to finance assets." />
                        <RatioCard title="Return on Equity" value={data.returnOnEquity ? (data.returnOnEquity * 100).toFixed(2) + '%' : 'N/A'} description="Profitability relative to shareholder equity." />
                        <RatioCard title="Current Ratio" value={data.currentRatio?.toFixed(2)} description="Ability to pay short-term obligations." />
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

function StatCard({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="glass p-4 rounded-xl flex flex-col items-start justify-center">
            <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">{label}</span>
            <span className="text-lg font-mono font-bold mt-1 text-foreground/90">{value}</span>
        </div>
    )
}

function RatioCard({ title, value, description }: { title: string, value?: string, description: string }) {
    return (
        <div className="glass p-5 rounded-xl border-l-4 border-l-primary/50 hover:border-l-primary transition-all group">
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-base font-bold group-hover:text-primary transition-colors">{title}</h4>
                <div className="text-xl font-mono font-bold">{value || 'N/A'}</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
    )
}

// Helpers
function formatCurrency(val?: number, currency: string = 'USD') {
    if (val === undefined || val === null) return 'N/A'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val)
}

function formatLargeNumber(num?: number) {
    if (num === undefined || num === null) return 'N/A'
    if (num >= 1.0e+12) return (num / 1.0e+12).toFixed(2) + "T"
    if (num >= 1.0e+9) return (num / 1.0e+9).toFixed(2) + "B"
    if (num >= 1.0e+6) return (num / 1.0e+6).toFixed(2) + "M"
    return num.toString()
}
