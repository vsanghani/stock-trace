"use client"

import * as React from "react"
import { usePnLStore } from "./usePnLStore"
import { Plus, X } from "lucide-react"

interface TradeFormProps {
    date: string
    onClose: () => void
}

export function TradeForm({ date, onClose }: TradeFormProps) {
    const { addTrade } = usePnLStore()
    const [formData, setFormData] = React.useState({
        ticker: "",
        quantity: "",
        buyPrice: "",
        sellPrice: "",
        fees: "0",
        notes: "",
    })

    // Basic styling for inputs to match glassmorphism
    const inputClassName = "w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm"
    const labelClassName = "block text-xs font-medium text-muted-foreground mb-1"

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Validate
        if (!formData.ticker || !formData.quantity || !formData.buyPrice || !formData.sellPrice) return

        addTrade({
            date,
            ticker: formData.ticker.toUpperCase(),
            quantity: Number(formData.quantity),
            buyPrice: Number(formData.buyPrice),
            sellPrice: Number(formData.sellPrice),
            fees: Number(formData.fees),
            notes: formData.notes,
        })

        // Reset form or close? Let's just reset for rapid entry, user can close manually.
        setFormData({
            ticker: "",
            quantity: "",
            buyPrice: "",
            sellPrice: "",
            fees: "0",
            notes: "",
        })

        // Optional: provide visual feedback?
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClassName}>Ticker</label>
                    <input
                        type="text"
                        placeholder="AAPL"
                        className={inputClassName}
                        value={formData.ticker}
                        onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                        autoFocus
                        required
                    />
                </div>
                <div>
                    <label className={labelClassName}>Quantity</label>
                    <input
                        type="number"
                        placeholder="10"
                        className={inputClassName}
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClassName}>Buy Price</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="150.00"
                        className={inputClassName}
                        value={formData.buyPrice}
                        onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className={labelClassName}>Sell Price</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="155.00"
                        className={inputClassName}
                        value={formData.sellPrice}
                        onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                        required
                    />
                </div>
            </div>

            <div>
                <label className={labelClassName}>Broker Fees</label>
                <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={inputClassName}
                    value={formData.fees}
                    onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                />
            </div>

            <div>
                <label className={labelClassName}>Notes (Optional)</label>
                <textarea
                    placeholder="Strategy used..."
                    className={`${inputClassName} resize-none h-20`}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
            </div>

            <div className="flex gap-2 pt-2">
                <button
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Trade
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-border/50 hover:bg-secondary/50 rounded-lg transition-colors"
                >
                    Close
                </button>
            </div>
        </form>
    )
}
