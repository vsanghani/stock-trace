import { NextResponse } from "next/server"
import { getOptionsPayload } from "@/lib/server/yahoo-finance-fetch"
import { pruneRateBuckets, rateLimitResponse } from "@/lib/server/rate-limit"

export async function GET(request: Request) {
    const limited = rateLimitResponse(request, "options")
    if (limited) return limited
    if (Math.random() < 0.05) pruneRateBuckets()

    const { searchParams } = new URL(request.url)
    const ticker = searchParams.get("ticker")
    const dateStr = searchParams.get("date")

    if (!ticker) {
        return NextResponse.json({ error: "Ticker symbol is required" }, { status: 400 })
    }

    let date: Date | null = null
    if (dateStr) {
        date = new Date(dateStr)
        if (Number.isNaN(date.getTime())) {
            return NextResponse.json({ error: "Invalid date parameter" }, { status: 400 })
        }
    }

    try {
        const optionsData = await getOptionsPayload(ticker, date)
        return NextResponse.json(optionsData)
    } catch (error) {
        console.error("Error fetching options data:", error)
        return NextResponse.json(
            { error: "Failed to fetch options data. The quote provider may be rate-limiting or unavailable." },
            { status: 502 }
        )
    }
}
