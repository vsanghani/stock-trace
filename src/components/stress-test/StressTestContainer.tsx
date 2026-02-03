"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Play, RotateCcw, Briefcase } from "lucide-react"
import { StressScenario, StressTestResult, SECTOR_OPTIONS, Sector } from "@/types/stress-test"
import { calculateStressImpact, formatCurrency } from "@/lib/stress-calculator"
import { useHoldingsStore } from "./useHoldingsStore"
import { ScenarioSelector } from "./ScenarioSelector"
import { ImpactVisualization } from "./ImpactVisualization"
import { RiskAlert } from "./RiskAlert"
import { cn } from "@/lib/utils"

export function StressTestContainer() {
    const { holdings, addHolding, deleteHolding, clearAllHoldings, getTotalValue, isLoaded } = useHoldingsStore()
    const [selectedScenario, setSelectedScenario] = React.useState<StressScenario | null>(null)
    const [result, setResult] = React.useState<StressTestResult | null>(null)
    const [isSimulating, setIsSimulating] = React.useState(false)
    const [showAddForm, setShowAddForm] = React.useState(false)

    // Form state for adding holdings
    const [formData, setFormData] = React.useState({
        ticker: "",
        shares: "",
        currentPrice: "",
        sector: "Technology" as Sector,
    })

    const handleAddHolding = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.ticker || !formData.shares || !formData.currentPrice) return

        addHolding({
            ticker: formData.ticker.toUpperCase(),
            shares: parseFloat(formData.shares),
            currentPrice: parseFloat(formData.currentPrice),
            sector: formData.sector,
        })

        setFormData({ ticker: "", shares: "", currentPrice: "", sector: "Technology" })
        setShowAddForm(false)
        setResult(null) // Clear previous results
    }

    const handleRunSimulation = async () => {
        if (!selectedScenario || holdings.length === 0) return

        setIsSimulating(true)

        // Simulate calculation delay for effect
        await new Promise(resolve => setTimeout(resolve, 1500))

        const calculatedResult = calculateStressImpact(holdings, selectedScenario)
        setResult(calculatedResult)
        setIsSimulating(false)
    }

    const handleReset = () => {
        setSelectedScenario(null)
        setResult(null)
    }

    if (!isLoaded) return null

    const totalValue = getTotalValue()

    return (
        <div className="space-y-8">
            {/* Portfolio Holdings Section */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Your Holdings
                    </h2>
                    <div className="flex items-center gap-2">
                        {holdings.length > 0 && (
                            <button
                                onClick={clearAllHoldings}
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
                            Add Holding
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
                                        Shares
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.shares}
                                        onChange={e => setFormData({ ...formData, shares: e.target.value })}
                                        placeholder="100"
                                        min="0"
                                        step="any"
                                        className="w-full px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                                        Current Price ($)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.currentPrice}
                                        onChange={e => setFormData({ ...formData, currentPrice: e.target.value })}
                                        placeholder="175.00"
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2 rounded-lg bg-secondary/50 border border-border/50 focus:border-primary focus:outline-none font-mono"
                                        required
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
                        <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground">
                            Add your holdings to run a stress test simulation
                        </p>
                    </div>
                ) : (
                    <div className="glass rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-secondary/50 border-b border-border/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Ticker</th>
                                        <th className="px-4 py-3 text-left font-semibold">Sector</th>
                                        <th className="px-4 py-3 text-right font-semibold">Shares</th>
                                        <th className="px-4 py-3 text-right font-semibold">Price</th>
                                        <th className="px-4 py-3 text-right font-semibold">Value</th>
                                        <th className="px-4 py-3 text-right font-semibold">Weight</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {holdings.map(holding => {
                                        const value = holding.shares * holding.currentPrice
                                        const weight = totalValue > 0 ? (value / totalValue) * 100 : 0
                                        return (
                                            <tr key={holding.id} className="hover:bg-secondary/30 transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold">{holding.ticker}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-secondary">
                                                        {holding.sector}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono">{holding.shares}</td>
                                                <td className="px-4 py-3 text-right font-mono">{formatCurrency(holding.currentPrice)}</td>
                                                <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(value)}</td>
                                                <td className="px-4 py-3 text-right font-mono text-muted-foreground">{weight.toFixed(1)}%</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => {
                                                            deleteHolding(holding.id)
                                                            setResult(null)
                                                        }}
                                                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot className="bg-secondary/30 border-t border-border/50">
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 font-semibold">Total Portfolio Value</td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-lg">{formatCurrency(totalValue)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">100%</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            {/* Scenario Selection */}
            {holdings.length > 0 && (
                <section>
                    <ScenarioSelector
                        selectedId={selectedScenario?.id || null}
                        onSelect={(scenario) => {
                            setSelectedScenario(scenario)
                            setResult(null)
                        }}
                    />
                </section>
            )}

            {/* Run Simulation Button */}
            {holdings.length > 0 && selectedScenario && (
                <div className="flex justify-center gap-4">
                    <motion.button
                        onClick={handleRunSimulation}
                        disabled={isSimulating}
                        className={cn(
                            "flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all",
                            "bg-gradient-to-r from-red-600 to-orange-500 text-white",
                            "hover:from-red-500 hover:to-orange-400",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Play className="w-5 h-5" />
                        {isSimulating ? "Simulating..." : "Run Stress Test"}
                    </motion.button>

                    {result && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={handleReset}
                            className="flex items-center gap-2 px-6 py-3 rounded-full font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset
                        </motion.button>
                    )}
                </div>
            )}

            {/* Results */}
            {(result || isSimulating) && (
                <section className="space-y-6">
                    <ImpactVisualization result={result} isSimulating={isSimulating} />

                    {result && (
                        <RiskAlert vulnerabilities={result.vulnerabilities} />
                    )}
                </section>
            )}
        </div>
    )
}
