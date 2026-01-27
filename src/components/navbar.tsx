import Link from "next/link"
import { MarketClock } from "@/components/market-clock"
import { ThemeToggle } from "@/components/theme-toggle"

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-40 h-16 px-6 flex items-center justify-between bg-background/60 backdrop-blur-md border-b border-border/50 transition-all duration-300">
            <Link href="/">
                <div className="font-bold text-xl tracking-tighter px-3 py-1 rounded-lg border border-transparent hover:border-border/50 transition-colors">
                    Stock Trace
                </div>
            </Link>

            <div className="flex items-center gap-4">
                <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Home
                </Link>
                <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                </Link>
                <Link href="/pnl-calculator" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    PnL Calculator
                </Link>
                <div className="h-4 w-px bg-border/50" />
                <MarketClock />
                <ThemeToggle />
            </div>
        </nav>
    )
}
