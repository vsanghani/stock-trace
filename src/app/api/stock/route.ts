import { NextResponse } from "next/server"
import { getStockQuotePayload } from "@/lib/server/yahoo-finance-fetch"
import { pruneRateBuckets, rateLimitResponse } from "@/lib/server/rate-limit"

export async function GET(request: Request) {
    const limited = rateLimitResponse(request, "stock")
    if (limited) return limited
    if (Math.random() < 0.05) pruneRateBuckets()

    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get("ticker")

    if (!ticker) {
        return NextResponse.json({ error: "Ticker is required" }, { status: 400 })
    }

    try {
        const stockData = await getStockQuotePayload(ticker)
        return NextResponse.json(stockData)
    } catch (error) {
        console.error("Error fetching stock data:", error)
        return NextResponse.json(
            { error: "Failed to fetch stock data. The quote provider may be rate-limiting or unavailable." },
            { status: 502 }
        )
    }
}
