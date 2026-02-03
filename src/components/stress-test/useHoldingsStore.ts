"use client"

import { useState, useEffect } from "react"
import { PortfolioHolding } from "@/types/stress-test"

const STORAGE_KEY = "stock-trace-stress-holdings"

export function useHoldingsStore() {
    const [holdings, setHoldings] = useState<PortfolioHolding[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                setHoldings(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse holdings data", e)
            }
        }
        setIsLoaded(true)
    }, [])

    // Save to localStorage whenever holdings change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings))
        }
    }, [holdings, isLoaded])

    const addHolding = (holding: Omit<PortfolioHolding, "id">) => {
        const newHolding: PortfolioHolding = {
            ...holding,
            id: crypto.randomUUID(),
        }
        setHoldings(prev => [...prev, newHolding])
    }

    const updateHolding = (id: string, updates: Partial<Omit<PortfolioHolding, "id">>) => {
        setHoldings(prev =>
            prev.map(h => (h.id === id ? { ...h, ...updates } : h))
        )
    }

    const deleteHolding = (id: string) => {
        setHoldings(prev => prev.filter(h => h.id !== id))
    }

    const clearAllHoldings = () => {
        setHoldings([])
    }

    const getTotalValue = () => {
        return holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0)
    }

    return {
        holdings,
        addHolding,
        updateHolding,
        deleteHolding,
        clearAllHoldings,
        getTotalValue,
        isLoaded,
    }
}
