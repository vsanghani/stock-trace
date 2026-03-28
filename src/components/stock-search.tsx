"use client"

import * as React from "react"
import { Search, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
// import { useDebounce } from "@/hooks/use-debounce" // We need to create this hook or implement simpler debounce

interface StockSearchProps {
    onSearch: (query: string) => void
    isLoading?: boolean
    /** When set from the URL (e.g. `?ticker=`), keeps the input aligned for bookmarks and back/forward */
    syncedSymbol?: string | null
}

interface Suggestion {
    symbol: string
    name: string
    exchange: string
    type: string
}

export function StockSearch({ onSearch, isLoading, syncedSymbol }: StockSearchProps) {
    const [query, setQuery] = React.useState("")
    const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
    const [showSuggestions, setShowSuggestions] = React.useState(false)

    React.useEffect(() => {
        if (syncedSymbol === undefined) return
        setQuery(syncedSymbol ? syncedSymbol : "")
    }, [syncedSymbol])

    // Custom debounce implementation inside component to avoid extra file for now
    const [debouncedQuery, setDebouncedQuery] = React.useState(query)

    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300)
        return () => clearTimeout(timer)
    }, [query])

    React.useEffect(() => {
        const fetchSuggestions = async () => {
            if (debouncedQuery.length < 2) {
                setSuggestions([])
                return
            }
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
                const data = await res.json()
                setSuggestions(data.suggestions || [])
            } catch (e) {
                console.error(e)
            }
        }

        fetchSuggestions()
    }, [debouncedQuery])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim()) {
            onSearch(query.trim())
            setShowSuggestions(false)
        }
    }

    const handleSelect = (symbol: string) => {
        setQuery(symbol)
        onSearch(symbol)
        setShowSuggestions(false)
    }

    return (
        <div className="relative w-full max-w-xl mx-auto z-50">
            <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                onSubmit={handleSubmit}
                className="relative"
            >
                <div className="relative group">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setShowSuggestions(true)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search ticker (e.g. AAPL, BHP.AX)..."
                        className="w-full h-14 pl-12 pr-4 text-lg bg-background/50 backdrop-blur-md border border-border/50 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-mono group-hover:shadow-primary/5 placeholder:text-muted-foreground/50"
                        autoFocus
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        ) : (
                            <Search className="w-5 h-5 group-focus-within:text-primary transition-colors" />
                        )}
                    </div>
                </div>
            </motion.form>

            <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-background/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto"
                    >
                        {suggestions.map((s) => (
                            <button
                                key={s.symbol + s.exchange}
                                onClick={() => handleSelect(s.symbol)}
                                className="w-full px-4 py-3 text-left hover:bg-primary/5 transition-colors flex items-center justify-between group"
                            >
                                <div>
                                    <div className="font-bold font-mono text-foreground group-hover:text-primary transition-colors">{s.symbol}</div>
                                    <div className="text-sm text-muted-foreground truncate max-w-[200px]">{s.name}</div>
                                </div>
                                <div className="text-xs font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                                    {s.exchange}
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlay to close suggestions when clicking outside */}
            {showSuggestions && (
                <div className="fixed inset-0 z-[-1]" onClick={() => setShowSuggestions(false)} />
            )}
        </div>
    )
}
