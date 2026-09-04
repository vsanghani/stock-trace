"use client"

import { useState, useEffect } from "react"

import { readStoredValue } from "@/lib/storage"

export interface Trade {
    id: string
    date: string // YYYY-MM-DD
    ticker: string
    quantity: number
    buyPrice: number
    sellPrice: number
    fees: number
    pnl: number
    notes?: string
}

const STORAGE_KEY = "plutox-pnl-data"

export function usePnLStore() {
    const [trades, setTrades] = useState<Trade[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = readStoredValue(STORAGE_KEY)
        if (saved) {
            try {
                setTrades(JSON.parse(saved))
            } catch (e) {
                console.error("Failed to parse PnL data", e)
            }
        }
        setIsLoaded(true)
    }, [])

    // Save to localStorage whenever trades change
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
        }
    }, [trades, isLoaded])

    const addTrade = (trade: Omit<Trade, "id" | "pnl">) => {
        const pnl = (trade.sellPrice - trade.buyPrice) * trade.quantity - trade.fees
        const newTrade: Trade = {
            ...trade,
            id: crypto.randomUUID(),
            pnl,
        }
        setTrades((prev) => [...prev, newTrade])
    }

    const deleteTrade = (id: string) => {
        setTrades((prev) => prev.filter((t) => t.id !== id))
    }

    const getTradesByDate = (date: string) => {
        return trades.filter((t) => t.date === date)
    }

    const getDayPnL = (date: string) => {
        return getTradesByDate(date).reduce((sum, t) => sum + t.pnl, 0)
    }

    const getMonthPnL = (year: number, month: number) => {
        // month is 0-indexed (0 = Jan)
        return trades
            .filter((t) => {
                const d = new Date(t.date)
                return d.getFullYear() === year && d.getMonth() === month
            })
            .reduce((sum, t) => sum + t.pnl, 0)
    }

    const getTotalPnL = () => {
        return trades.reduce((sum, t) => sum + t.pnl, 0)
    }

    return {
        trades,
        addTrade,
        deleteTrade,
        getTradesByDate,
        getDayPnL,
        getMonthPnL,
        getTotalPnL,
        isLoaded,
    }
}
