import { NextResponse } from "next/server"
import { normalizeTicker } from "@/lib/holders/dates"
import { loadHolders } from "@/lib/holders/query"
import { emptyHolders } from "@/lib/holders/resolve"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface RouteParams {
    params: Promise<{ ticker: string }>
}

const TICKER = /^[A-Z0-9][A-Z0-9.\-]{0,14}$/

export async function GET(_request: Request, { params }: RouteParams) {
    const { ticker } = await params
    const symbol = normalizeTicker(ticker ?? "")
    if (!TICKER.test(symbol)) {
        return NextResponse.json({ error: "Ticker is required" }, { status: 400 })
    }

    // The stock page stays usable in environments that have not been given a database.
    if (!process.env.DATABASE_URL) {
        return NextResponse.json(emptyHolders(symbol))
    }

    try {
        return NextResponse.json(await loadHolders(symbol))
    } catch (error) {
        console.error("holders query failed", error)
        return NextResponse.json(emptyHolders(symbol))
    }
}
