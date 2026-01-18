"use client"

import * as React from "react"
import { StockSearch } from "@/components/stock-search"
import { StockDashboard } from "@/components/stock-dashboard"
import { RiskSelector, RiskProfile } from "@/components/risk-selector"
import { motion, AnimatePresence } from "framer-motion"

export default function Home() {
  const [ticker, setTicker] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [riskProfile, setRiskProfile] = React.useState<"conservative" | "moderate" | "aggressive">("moderate")

  const handleSearch = async (query: string) => {
    setLoading(true)
    // Simulate API call for now
    await new Promise(resolve => setTimeout(resolve, 1000))
    setTicker(query)
    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 min-h-[calc(100vh-4rem)] flex flex-col items-center py-12 relative z-10">
      <AnimatePresence mode="wait">
        {!ticker ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center flex-1 w-full max-w-2xl text-center space-y-8 mt-20"
          >
            <div className="space-y-4">
              <h1 className="text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
                Stock Trace
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                Global market analysis. Real-time data for NYSE, NASDAQ, ASX, HKEX, JPX, LSE.
              </p>
            </div>

            <div className="space-y-6 w-full flex flex-col items-center">
              <StockSearch onSearch={handleSearch} isLoading={loading} />
              <RiskSelector selected={riskProfile} onSelect={setRiskProfile} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            className="w-full space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setTicker(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors self-start md:self-auto"
              >
                ← Back to Search
              </button>
              <div className="w-full max-w-xl flex flex-col gap-4">
                <StockSearch onSearch={handleSearch} isLoading={loading} />
                <div className="flex justify-center">
                  <RiskSelector selected={riskProfile} onSelect={setRiskProfile} />
                </div>
              </div>
              <div className="w-[100px] hidden md:block"></div> {/* Spacer for alignment */}
            </div>
            <StockDashboard ticker={ticker} riskProfile={riskProfile} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
