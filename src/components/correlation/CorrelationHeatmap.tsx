"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Grid3X3, Briefcase, Sparkles } from "lucide-react"
import {
    CorrelationHolding,
    CorrelationMatrix,
    Sector,
    Industry,
    INDUSTRY_BY_SECTOR
} from "@/types/correlation"
import {
    calculateCorrelationMatrix,
    generateDiversificationTips
} from "@/lib/correlation-calculator"
import { useCorrelationStore } from "./useCorrelationStore"
import { HeatmapGrid } from "./HeatmapGrid"
import { RiskInsights } from "./RiskInsights"
import { cn } from "@/lib/utils"

const SECTOR_OPTIONS: Sector[] = [
    'Technology',
    'Financials',
    'Healthcare',
    'Energy',
    'Utilities',
    'Consumer Discretionary',
    'Consumer Staples',
    'Communication Services',
    'Industrials',
    'Real Estate',
    'Materials',
]

export function CorrelationHeatmap() {
    const { holdings, addHolding, deleteHolding, clearAllHoldings, isLoaded } = useCorrelationStore()
    const [showAddForm, setShowAddForm] = React.useState(false)
    const [matrix, setMatrix] = React.useState<CorrelationMatrix | null>(null)
    const [isAnalyzing, setIsAnalyzing] = React.useState(false)

    // Form state
    const [formData, setFormData] = React.useState({
        ticker: "",
        name: "",
        sector: "Technology" as Sector,
        industry: "Software" as Industry,
    })

    // Get available industries based on selected sector
    const availableIndustries = INDUSTRY_BY_SECTOR[formData.sector] || ['Other']

    // Update industry when sector changes
    React.useEffect(() => {
        const industries = INDUSTRY_BY_SECTOR[formData.sector] || ['Other']
        if (!industries.includes(formData.industry)) {
            setFormData(prev => ({ ...prev, industry: industries[0] }))
        }
    }, [formData.sector])

    const handleAddHolding = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.ticker) return

        addHolding({
            ticker: formData.ticker.toUpperCase(),
            name: formData.name || formData.ticker.toUpperCase(),
            sector: formData.sector,
            industry: formData.industry,
        })

        setFormData({ ticker: "", name: "", sector: "Technology", industry: "Software" })
        setShowAddForm(false)
        setMatrix(null) // Clear previous analysis
    }

    const handleAnalyze = async () => {
        if (holdings.length < 2) return

        setIsAnalyzing(true)

        // Simulate analysis delay for effect
        await new Promise(resolve => setTimeout(resolve, 1200))

        const result = calculateCorrelationMatrix(holdings)
        setMatrix(result)
        setIsAnalyzing(false)
    }

    if (!isLoaded) return null

    const tips = matrix ? generateDiversificationTips(matrix) : []

    return (
        <div className="space-y-8">
            {/* Holdings Input Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Portfolio Holdings
                    </h2>
                    <div className="flex items-center gap-2">
                        {holdings.length > 0 && (
                            <button
                                onClick={() => {
                                    clearAllHoldings()
                                    setMatrix(null)
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear All
                            </button>
                        )}
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                showAddForm
                                    ? "bg-secondary text-secondary-foreground"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                            )}
                        >
                            <Plus className="w-4 h-4" />
                            Add Stock
                        </button>
                    </div>
                </div>

                {/* Add Holding Form */}
                <AnimatePresence>
                    {showAddForm && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            onSubmit={handleAddHolding}
                            className="glass rounded-xl p-6 space-y-4 overflow-hidden"
                        >
                            <div className="grid gap-4 sm:grid-cols-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                                        Ticker
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.ticker}
                                        onChange={e => setFormData({ ...formData, ticker: e.target.value })}
                                        placeholder="AAPL"
                                        className="w-full px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none font-mono uppercase"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                                        Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Apple Inc"
                                        className="w-full px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                                        Sector
                                    </label>
                                    <select
                                        value={formData.sector}
                                        onChange={e => setFormData({ ...formData, sector: e.target.value as Sector })}
                                        className="w-full px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none"
                                    >
                                        {SECTOR_OPTIONS.map(sector => (
                                            <option key={sector} value={sector}>{sector}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                                        Industry
                                    </label>
                                    <select
                                        value={formData.industry}
                                        onChange={e => setFormData({ ...formData, industry: e.target.value as Industry })}
                                        className="w-full px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none"
                                    >
                                        {availableIndustries.map(industry => (
                                            <option key={industry} value={industry}>{industry}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    Add to Portfolio
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* Holdings List */}
                {holdings.length === 0 ? (
                    <div className="glass rounded-xl p-8 text-center">
                        <Grid3X3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground">
                            Add at least 2 stocks to generate a correlation heatmap
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {holdings.map(holding => (
                            <motion.div
                                key={holding.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50"
                            >
                                <span className="font-mono font-bold">{holding.ticker}</span>
                                <span className="text-xs text-muted-foreground">({holding.industry})</span>
                                <button
                                    onClick={() => {
                                        deleteHolding(holding.id)
                                        setMatrix(null)
                                    }}
                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {/* Analyze Button */}
            {holdings.length >= 2 && (
                <div className="flex justify-center">
                    <motion.button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className={cn(
                            "flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all",
                            "bg-gradient-to-r from-amber-600 to-orange-500 text-white",
                            "hover:from-amber-500 hover:to-orange-400",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Sparkles className="w-5 h-5" />
                        {isAnalyzing ? "Analyzing..." : "Generate Correlation Heatmap"}
                    </motion.button>
                </div>
            )}

            {/* Results */}
            <AnimatePresence>
                {(matrix || isAnalyzing) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-8"
                    >
                        {/* Heatmap Grid */}
                        <section className="glass rounded-xl p-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
                                <Grid3X3 className="w-5 h-5 text-amber-500" />
                                Correlation Matrix
                            </h3>

                            {isAnalyzing ? (
                                <div className="flex items-center justify-center py-16">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full"
                                    />
                                </div>
                            ) : matrix ? (
                                <HeatmapGrid matrix={matrix} />
                            ) : null}
                        </section>

                        {/* Risk Insights */}
                        {matrix && (
                            <section>
                                <RiskInsights tips={tips} />
                            </section>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
