"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, X, ChevronDown, FlaskConical } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth, UserButton } from "@clerk/nextjs"
import { MarketClock } from "@/components/market-clock"
import { ThemeToggle } from "@/components/theme-toggle"
import { SITE_NAME } from "@/lib/site"

const EXPERIMENTS = [
    { href: "/senlogic", label: "senLogic", description: "Sentiment Analysis" },
    { href: "/stress-test", label: "Stress Test", description: "Portfolio Scenarios" },
    { href: "/correlation", label: "Correlation", description: "Heatmap Analysis" },
    { href: "/whisper-alerts", label: "Whisper Alerts", description: "Smart Notifications" },
]

/** Links that require a session — hidden from visitors, who would only be bounced to sign-in. */
const APP_LINKS = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/blog", label: "Blog" },
    { href: "/pnl-calculator", label: "PnL Calculator" },
    { href: "/options", label: "Options" },
    { href: "/valuation", label: "Valuation" },
]

const PUBLIC_LINKS = [
    { href: "/", label: "Home" },
    { href: "/blog", label: "Blog" },
]

export function Navbar() {
    const { isSignedIn } = useAuth()
    const [isOpen, setIsOpen] = React.useState(false)
    const [experimentsOpen, setExperimentsOpen] = React.useState(false)
    const [mobileExperimentsOpen, setMobileExperimentsOpen] = React.useState(false)
    const experimentsRef = React.useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (experimentsRef.current && !experimentsRef.current.contains(event.target as Node)) {
                setExperimentsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const links = isSignedIn ? APP_LINKS : PUBLIC_LINKS

    return (
        <nav className="fixed top-0 left-0 right-0 z-40 h-16 px-6 flex items-center justify-between bg-background/60 backdrop-blur-md border-b border-border/50 transition-all duration-300">
            <Link href={isSignedIn ? "/dashboard" : "/"} className="z-50">
                <div className="font-bold text-xl tracking-tighter px-3 py-1 rounded-lg border border-transparent hover:border-border/50 transition-colors">
                    {SITE_NAME}
                </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {link.label}
                    </Link>
                ))}

                {/* xperiments Dropdown */}
                {isSignedIn && (
                    <div ref={experimentsRef} className="relative">
                        <button
                            onClick={() => setExperimentsOpen(!experimentsOpen)}
                            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary/50"
                        >
                            <FlaskConical className="w-4 h-4" />
                            xperiments
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${experimentsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {experimentsOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute top-full right-0 mt-2 w-56 py-2 rounded-xl glass-strong"
                                >
                                    {/* Glass shimmer overlay */}
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />

                                    {EXPERIMENTS.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setExperimentsOpen(false)}
                                            className="relative flex flex-col px-4 py-2.5 hover:bg-foreground/5 transition-colors"
                                        >
                                            <span className="text-sm font-semibold text-foreground">
                                                {item.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {item.description}
                                            </span>
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                <div className="h-4 w-px bg-border/50" />
                {isSignedIn && <MarketClock />}
                <ThemeToggle />

                {isSignedIn ? (
                    <UserButton />
                ) : (
                    <div className="flex items-center gap-2">
                        <Link
                            href="/sign-in"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/sign-up"
                            className="h-9 px-4 inline-flex items-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            Get started
                        </Link>
                    </div>
                )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2 z-50">
                {isSignedIn && <UserButton />}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 hover:bg-secondary/50 rounded-full transition-colors"
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 top-0 left-0 right-0 bottom-0 bg-background/95 backdrop-blur-xl z-40 flex flex-col pt-24 px-6 pb-8 md:hidden overflow-y-auto"
                    >
                        <div className="flex flex-col space-y-4">
                            {links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className="text-2xl font-bold tracking-tight hover:text-primary transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ))}

                            {/* Mobile xperiments Section */}
                            {isSignedIn && (
                                <div className="pt-2">
                                    <button
                                        onClick={() => setMobileExperimentsOpen(!mobileExperimentsOpen)}
                                        className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary"
                                    >
                                        <FlaskConical className="w-6 h-6" />
                                        xperiments
                                        <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${mobileExperimentsOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    <AnimatePresence>
                                        {mobileExperimentsOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden mt-3 ml-4 pl-4 border-l-2 border-primary/30 space-y-3"
                                            >
                                                {EXPERIMENTS.map((item) => (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setIsOpen(false)}
                                                        className="block"
                                                    >
                                                        <span className="text-xl font-semibold hover:text-primary transition-colors">
                                                            {item.label}
                                                        </span>
                                                        <span className="block text-sm text-muted-foreground">
                                                            {item.description}
                                                        </span>
                                                    </Link>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {!isSignedIn && (
                            <div className="mt-8 flex flex-col gap-3">
                                <Link
                                    href="/sign-up"
                                    onClick={() => setIsOpen(false)}
                                    className="h-12 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold"
                                >
                                    Create a free account
                                </Link>
                                <Link
                                    href="/sign-in"
                                    onClick={() => setIsOpen(false)}
                                    className="h-12 inline-flex items-center justify-center rounded-xl border border-border/50 font-semibold"
                                >
                                    Sign in
                                </Link>
                            </div>
                        )}

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
