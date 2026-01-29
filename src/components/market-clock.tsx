"use client"

import * as React from "react"
import { Monitor, Moon, Sun, Clock } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

type Market = {
    id: string
    name: string
    timezone: string
    openTime: string // HH:mm
    closeTime: string // HH:mm
}

const MARKETS: Market[] = [
    { id: "NYSE", name: "New York (NYSE)", timezone: "America/New_York", openTime: "09:30", closeTime: "16:00" },
    { id: "NASDAQ", name: "New York (NASDAQ)", timezone: "America/New_York", openTime: "09:30", closeTime: "16:00" },
    { id: "LSE", name: "London (LSE)", timezone: "Europe/London", openTime: "08:00", closeTime: "16:30" },
    { id: "HKEX", name: "Hong Kong (HKEX)", timezone: "Asia/Hong_Kong", openTime: "09:30", closeTime: "16:00" },
    { id: "JPX", name: "Tokyo (JPX)", timezone: "Asia/Tokyo", openTime: "09:00", closeTime: "15:00" },
    { id: "ASX", name: "Sydney (ASX)", timezone: "Australia/Sydney", openTime: "10:00", closeTime: "16:00" },
]

export function MarketClock() {
    const [selectedMarket, setSelectedMarket] = React.useState<Market>(MARKETS[0])
    const [currentTime, setCurrentTime] = React.useState<string>("")
    const [isOpen, setIsOpen] = React.useState<boolean>(false)
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)

    React.useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date()

            // Get current time in market timezone
            const timeInZone = now.toLocaleTimeString("en-US", {
                timeZone: selectedMarket.timezone,
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            })
            setCurrentTime(timeInZone)

            // Check if market is open
            const marketTime = new Date(now.toLocaleString("en-US", { timeZone: selectedMarket.timezone }))
            const currentHours = marketTime.getHours()
            const currentMinutes = marketTime.getMinutes()

            const [openHour, openMinute] = selectedMarket.openTime.split(":").map(Number)
            const [closeHour, closeMinute] = selectedMarket.closeTime.split(":").map(Number)

            const currentTimeValue = currentHours * 60 + currentMinutes
            const openTimeValue = openHour * 60 + openMinute
            const closeTimeValue = closeHour * 60 + closeMinute

            // Simple open check (ignores weekends/holidays for now, can be improved)
            const day = marketTime.getDay()
            const isWeekday = day >= 1 && day <= 5

            setIsOpen(isWeekday && currentTimeValue >= openTimeValue && currentTimeValue < closeTimeValue)

        }, 1000)

        return () => clearInterval(timer)
    }, [selectedMarket])

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-3 bg-secondary/50 hover:bg-secondary/80 backdrop-blur-md px-4 py-2 rounded-full border border-border transition-all duration-300"
            >
                <div className={`w-2 h-2 rounded-full ${isOpen ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]"}`} />
                <span className="font-mono font-medium text-sm w-16">{selectedMarket.id}</span>
                <span className="font-mono text-sm opacity-80 w-20">{currentTime}</span>
            </button>

            <AnimatePresence>
                {isDropdownOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-12 right-0 w-64 bg-background/95 backdrop-blur-2xl border border-border/50 rounded-xl shadow-lg p-2 flex flex-col gap-1"
                    >
                        {MARKETS.map((market) => (
                            <button
                                key={market.id}
                                onClick={() => {
                                    setSelectedMarket(market)
                                    setIsDropdownOpen(false)
                                }}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors hover:bg-secondary/50 ${selectedMarket.id === market.id ? "bg-secondary" : ""}`}
                            >
                                <span>{market.name}</span>
                                {selectedMarket.id === market.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
