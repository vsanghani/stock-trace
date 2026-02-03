"use client"

import { useState, useEffect } from "react"
import { CorrelationHolding, Sector, Industry } from "@/types/correlation"

const STORAGE_KEY = "stock-trace-correlation-holdings"

export function useCorrelationStore() {
    const [holdings, setHoldings] = useState<CorrelationHolding[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                setHoldings(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse correlation holdings data", e)
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

    const addHolding = (holding: Omit<CorrelationHolding, "id">) => {
        const newHolding: CorrelationHolding = {
            ...holding,
            id: crypto.randomUUID(),
        }
        setHoldings(prev => [...prev, newHolding])
    }

    const updateHolding = (id: string, updates: Partial<Omit<CorrelationHolding, "id">>) => {
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

    return {
        holdings,
        addHolding,
        updateHolding,
        deleteHolding,
        clearAllHoldings,
        isLoaded,
    }
}
