"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { MarketClock } from "@/components/market-clock"
import { ThemeToggle } from "@/components/theme-toggle"

export function Navbar() {
    const [isOpen, setIsOpen] = React.useState(false)

    return (
        <nav className="fixed top-0 left-0 right-0 z-40 h-16 px-6 flex items-center justify-between bg-background/60 backdrop-blur-md border-b border-border/50 transition-all duration-300">
            <Link href="/" className="z-50">
                <div className="font-bold text-xl tracking-tighter px-3 py-1 rounded-lg border border-transparent hover:border-border/50 transition-colors">
                    Stock Trace
                </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
                <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Home
                </Link>
                <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                </Link>
                <Link href="/pnl-calculator" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    PnL Calculator
                </Link>
                <Link href="/stress-test" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Stress Test
                </Link>
                <div className="h-4 w-px bg-border/50" />
                <MarketClock />
                <ThemeToggle />
            </div>

            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden z-50 p-2 hover:bg-secondary/50 rounded-full transition-colors"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 top-0 left-0 right-0 bottom-0 bg-background/95 backdrop-blur-xl z-40 flex flex-col pt-24 px-6 pb-8 md:hidden"
                    >
                        <div className="flex flex-col space-y-4">
                            <Link
                                href="/"
                                onClick={() => setIsOpen(false)}
                                className="text-2xl font-bold tracking-tight hover:text-primary transition-colors"
                            >
                                Home
                            </Link>
                            <Link
                                href="/blog"
                                onClick={() => setIsOpen(false)}
                                className="text-2xl font-bold tracking-tight hover:text-primary transition-colors"
                            >
                                Blog
                            </Link>
                            <Link
                                href="/pnl-calculator"
                                onClick={() => setIsOpen(false)}
                                className="text-2xl font-bold tracking-tight hover:text-primary transition-colors"
                            >
                                PnL Calculator
                            </Link>
                            <Link
                                href="/stress-test"
                                onClick={() => setIsOpen(false)}
                                className="text-2xl font-bold tracking-tight hover:text-primary transition-colors"
                            >
                                Stress Test
                            </Link>
                        </div>

                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-muted-foreground">Theme</span>
                                <ThemeToggle />
                            </div>
                        </div>

                        <div className="mt-auto pb-8 flex justify-center">
                            <MarketClock />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    )
}
