import { NextResponse } from "next/server"

import { CACHE_TTL_SECONDS, fetchValuationSnapshot } from "@/lib/api/stockData"
import { absentBodySchema, parseJsonBody, parseWithSchema, tickerParamsSchema } from "@/lib/api/validate"

export const revalidate = 3600

export async function GET(request: Request, { params }: { params: Promise<{ ticker: string }> }) {
    const parsed = parseWithSchema(tickerParamsSchema, await params)
    if (!parsed.ok) return parsed.response

    const body = await parseJsonBody(request, absentBodySchema)
    if (!body.ok) return body.response

    const { ticker } = parsed.data

    try {
        const snapshot = await fetchValuationSnapshot(ticker)

        return NextResponse.json(snapshot, {
            headers: {
                "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=86400`,
            },
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "valuation lookup failed"
        console.error(`Valuation lookup failed for ${ticker}: ${message}`)
        return NextResponse.json({ error: "No valuation data available" }, { status: 404 })
    }
}
