import { NextResponse } from "next/server"

import { absentBodySchema, parseJsonBody } from "@/lib/api/validate"

/**
 * Liveness check for the preview smoke job. No upstream calls, no database,
 * and no session. Auth is skipped in `proxy.ts`; the rate limiter still applies.
 */
export async function GET(request: Request) {
    const body = await parseJsonBody(request, absentBodySchema)
    if (!body.ok) return body.response
    return NextResponse.json({ ok: true })
}
