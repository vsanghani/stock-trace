"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowDown, ArrowUp, Download, Loader2, Target, TrendingUp, History } from "lucide-react"
import { StockData } from "@/types/stock"
import { SentimentBadge } from "@/components/SentimentBadge"
import { CompanyInfo } from "@/components/company-info"

interface StockDashboardProps {
    ticker: string
}

export function StockDashboard({ ticker }: StockDashboardProps) {
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

-- MARKET DATA --
Price: ${formatCurrency(data.regularMarketPrice, data.currency)}
Change: ${formatCurrency(data.regularMarketChange, data.currency)} (${(data.regularMarketChangePercent * 100).toFixed(2)}%)
Market Cap: ${formatLargeNumber(data.marketCap)}
Beta: ${data.beta?.toFixed(2) || 'N/A'}
52W High: ${formatCurrency(data.fiftyTwoWeekHigh, data.currency)}
52W Low: ${formatCurrency(data.fiftyTwoWeekLow, data.currency)}

-- ANALYST CONSENSUS --
Buy: ${data.consensus?.buy} | Hold: ${data.consensus?.hold} | Sell: ${data.consensus?.sell}
Mean Target: ${formatCurrency(data.targets?.mean, data.currency)}
Current Price: ${formatCurrency(data.targets?.current, data.currency)}

-- RATIO ANALYSIS --
P/E Ratio: ${data.trailingPE?.toFixed(2) || 'N/A'}
P/B Ratio: ${data.priceToBook?.toFixed(2) || 'N/A'}
Debt/Equity: ${data.debtToEquity?.toFixed(2) || 'N/A'}
ROE: ${data.returnOnEquity ? (data.returnOnEquity * 100).toFixed(2) + '%' : 'N/A'}
`
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${data.symbol}_Analysis.txt`
        a.click()
        URL.revokeObjectURL(url)
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

    // Calculate Consensus Summary
    const totalRatings = (data.consensus?.buy || 0) + (data.consensus?.strongBuy || 0) + (data.consensus?.hold || 0) + (data.consensus?.sell || 0) + (data.consensus?.strongSell || 0);
    const buyPercentage = totalRatings > 0 ? ((data.consensus?.buy || 0) + (data.consensus?.strongBuy || 0)) / totalRatings * 100 : 0;

    let consensusLabel = "Neutral";
    let consensusColor = "text-yellow-500";

    if (buyPercentage > 60) {
        consensusLabel = "Buy";
        consensusColor = "text-green-500";
    } else if (buyPercentage < 20) {
        consensusLabel = "Sell";
        consensusColor = "text-red-500";
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl mx-auto space-y-8 pb-12"
        >
            {/* Header Section */}
            <div className="glass rounded-xl shadow-lg p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-3">
                    <div>
                        <h2 className="text-4xl font-bold tracking-tight">{data.symbol}</h2>
                        <p className="text-muted-foreground text-lg">{data.shortName}</p>
                    </div>
                    <SentimentBadge ticker={ticker} />
                </div>
                <div className="text-right flex flex-col items-end">
                    <div className="text-4xl font-mono font-bold">
                        {formatCurrency(data.regularMarketPrice, data.currency)}
                    </div>
                    <div className={`flex items-center gap-1 text-lg font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                        {formatCurrency(Math.abs(data.regularMarketChange || 0), data.currency)} ({(Math.abs(data.regularMarketChangePercent || 0) * 100).toFixed(2)}%)
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Column: Stock Price Info (60%) */}
                <div className="lg:col-span-3 space-y-8">
                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <StatCard label="Market Cap" value={formatLargeNumber(data.marketCap)} />
                        <StatCard label="Beta" value={data.beta?.toFixed(2) || 'N/A'} />
                        <StatCard label="52W High" value={formatCurrency(data.fiftyTwoWeekHigh, data.currency)} />
                        <StatCard label="52W Low" value={formatCurrency(data.fiftyTwoWeekLow, data.currency)} />
                        <StatCard label="Dividend" value={data.dividendRate || 'N/A'} />
                        <StatCard label="Yield" value={data.dividendYield ? (data.dividendYield * 100).toFixed(2) + '%' : 'N/A'} />
                        <StatCard label="P/E Ratio" value={data.trailingPE?.toFixed(2) || 'N/A'} />
                        <StatCard label="EPS" value={data.trailingPE ? ((data.regularMarketPrice || 0) / data.trailingPE).toFixed(2) : 'N/A'} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Analyst Consensus & targets */}
                        <div className="space-y-6">
                            {/* Consensus Card */}
                            <div className="glass rounded-xl shadow-lg p-6 flex flex-col items-center text-center space-y-4">
                                <h3 className="text-xl font-bold flex items-center gap-2"><Target className="w-5 h-5" /> Analyst Consensus</h3>
                                <div className="text-5xl font-black transition-all duration-500 animate-in zoom-in spin-in-3">
                                    {consensusLabel === "Buy" ? "🚀" : consensusLabel === "Sell" ? "📉" : "⚖️"}
                                </div>

                                <div className="w-full pt-4 border-t border-border">
                                    <p className="text-sm text-muted-foreground mb-1">Overall Recommendation</p>
                                    <div className={`text-3xl font-black ${consensusColor}`}>{consensusLabel}</div>
                                    <div className="flex justify-center gap-4 mt-4 text-xs font-medium">
                                        <div className="text-green-500 flex flex-col">
                                            <span className="text-lg">{data.consensus?.buy || 0}</span>
                                            <span>BUY</span>
                                        </div>
                                        <div className="text-yellow-500 flex flex-col">
                                            <span className="text-lg">{data.consensus?.hold || 0}</span>
                                            <span>HOLD</span>
                                        </div>
                                        <div className="text-red-500 flex flex-col">
                                            <span className="text-lg">{data.consensus?.sell || 0}</span>
                                            <span>SELL</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price Targets Card */}
                            <div className="glass rounded-xl shadow-lg p-6 space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Price Targets</h3>
                                <div className="space-y-3">
                                    <TargetRow label="High" value={data.targets?.high} currency={data.currency} />
                                    <TargetRow label="Mean" value={data.targets?.mean} currency={data.currency} highlight />
                                    <TargetRow label="Low" value={data.targets?.low} currency={data.currency} />
                                    <div className="border-t border-border pt-2 mt-2">
                                        <TargetRow label="Current" value={data.targets?.current} currency={data.currency} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Ratios */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold">Financial Ratios</h3>
                                <button
                                    onClick={handleExport}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Export
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <RatioCard title="Price to Book" value={data.priceToBook?.toFixed(2)} description="Market value relative to book value." />
                                <RatioCard title="Debt to Equity" value={data.debtToEquity?.toFixed(2)} description="Proportion of equity and debt used to finance assets." />
                                <RatioCard title="Return on Equity" value={data.returnOnEquity ? (data.returnOnEquity * 100).toFixed(2) + '%' : 'N/A'} description="Profitability relative to shareholder equity." />
                                <RatioCard title="Current Ratio" value={data.currentRatio?.toFixed(2)} description="Ability to pay short-term obligations." />
                            </div>
                        </div>
                    </div>

                    {/* Analyst Recent Actions */}
                    <div className="space-y-4">
                        <h3 className="text-2xl font-bold flex items-center gap-2">
                            <History className="w-6 h-6" /> Recent Analyst Actions
                        </h3>
                        <div className="glass rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-white/5 text-muted-foreground border-b border-white/10">
                                        <tr>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Firm</th>
                                            <th className="px-6 py-4">Action</th>
                                            <th className="px-6 py-4">Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.analystActions && data.analystActions.length > 0 ? (
                                            data.analystActions.map((action, i) => (
                                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap opacity-80">
                                                        {new Date(action.date).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">{action.firm}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                                                            ${action.action.includes('up') ? 'bg-green-500/10 text-green-500' :
                                                                action.action.includes('down') ? 'bg-red-500/10 text-red-500' :
                                                                    'bg-blue-500/10 text-blue-500'}`}>
                                                            {action.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 opacity-90">
                                                        {action.fromGrade && <span className="text-muted-foreground text-xs">{action.fromGrade} → </span>}
                                                        {action.toGrade}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                                    No recent analyst actions found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Company Bio (40%) */}
                <div className="lg:col-span-2">
                    <CompanyInfo data={data} />
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

function TargetRow({ label, value, currency, highlight }: { label: string, value?: number, currency: string, highlight?: boolean }) {
    return (
        <div className={`flex justify-between items-center p-2 rounded-lg ${highlight ? 'bg-primary/10' : ''}`}>
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            <span className={`font-mono font-bold ${highlight ? 'text-primary' : ''}`}>
                {value ? formatCurrency(value, currency) : 'N/A'}
            </span>
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
