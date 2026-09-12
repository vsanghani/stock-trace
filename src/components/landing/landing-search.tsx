"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Lock } from "lucide-react"
import { StockSearch } from "@/components/stock-search"

/**
 * Ticker search for the public landing page.
 *
 * Visitors are sent to sign-in with the destination attached as `redirect_url`,
 * so Clerk drops them straight onto the requested stock once authenticated.
 * Signed-in users skip the detour.
 */
export function LandingSearch() {
    const { isSignedIn } = useAuth()
    const router = useRouter()
    const [pending, setPending] = React.useState(false)

    const handleSearch = (query: string) => {
        setPending(true)
        const destination = `/dashboard?ticker=${encodeURIComponent(query)}`
        router.push(
            isSignedIn
                ? destination
                : `/sign-in?redirect_url=${encodeURIComponent(destination)}`
        )
    }

    return (
        <div className="w-full flex flex-col items-center gap-3">
            <StockSearch
                onSearch={handleSearch}
                isLoading={pending}
                autoFocus={false}
                placeholder="Try a ticker — AAPL, NVDA, BHP.AX..."
            />
            {!isSignedIn && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    Sign in to unlock the full report — we&apos;ll take you right to it.
                </p>
            )}
        </div>
    )
}
