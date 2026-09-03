import { NextResponse } from "next/server"

import { CACHE_TTL_SECONDS, fetchValuationSnapshot } from "@/lib/api/stockData"

export const revalidate = 3600

export async function GET(_request: Request, { params }: { params: Promise<{ ticker: string }> }) {
    const { ticker } = await params

    if (!ticker || !/^[A-Za-z0-9.\-^]{1,12}$/.test(ticker)) {
        return NextResponse.json({ error: "Invalid ticker symbol", ticker }, { status: 400 })
    }

    try {
        const snapshot = await fetchValuationSnapshot(ticker)

        return NextResponse.json(snapshot, {
            headers: {
                "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=86400`,
            },
        })
    } catch (error) {
        console.error(`Valuation lookup failed for ${ticker}:`, error)
        return NextResponse.json(
            { error: `No valuation data available for ${ticker.toUpperCase()}`, ticker },
            { status: 404 }
        )
    }
}
