import { NextResponse } from "next/server"

export type RateRoute = "stock" | "options" | "sentiment"

type Bucket = { windowStart: number; count: number }

const buckets = new Map<string, Bucket>()

function windowMs(): number {
    return 60_000
}

function limitFor(route: RateRoute): number {
    const envKey =
        route === "stock"
            ? "STOCK_TRACE_RATE_STOCK_PER_MIN"
            : route === "options"
              ? "STOCK_TRACE_RATE_OPTIONS_PER_MIN"
              : "STOCK_TRACE_RATE_SENTIMENT_PER_MIN"
    const raw = process.env[envKey]
    const n = raw ? parseInt(raw, 10) : NaN
    if (Number.isFinite(n) && n > 0) return n
    return route === "sentiment" ? 20 : route === "options" ? 40 : 60
}

function bypassToken(): string | undefined {
    return process.env.STOCK_TRACE_API_TOKEN?.trim()
}

export function clientIp(request: Request): string {
    const xf = request.headers.get("x-forwarded-for")
    if (xf) {
        const first = xf.split(",")[0]?.trim()
        if (first) return first
    }
    const real = request.headers.get("x-real-ip")?.trim()
    if (real) return real
    return "unknown"
}

function isBypassed(request: Request): boolean {
    const token = bypassToken()
    if (!token) return false
    const auth = request.headers.get("authorization")
    if (auth === `Bearer ${token}`) return true
    const hdr = request.headers.get("x-stock-trace-token")
    return hdr === token
}

/**
 * Returns null if allowed, or a 429 NextResponse.
 */
export function rateLimitResponse(request: Request, route: RateRoute): NextResponse | null {
    if (isBypassed(request)) return null

    const ip = clientIp(request)
    const limit = limitFor(route)
    const w = windowMs()
    const key = `${route}:${ip}`
    const now = Date.now()
    let b = buckets.get(key)

    if (!b || now - b.windowStart >= w) {
        buckets.set(key, { windowStart: now, count: 1 })
        return null
    }

    if (b.count >= limit) {
        const retryAfterSec = Math.max(1, Math.ceil((b.windowStart + w - now) / 1000))
        return NextResponse.json(
            { error: "Too many requests", retryAfterSeconds: retryAfterSec },
            {
                status: 429,
                headers: { "Retry-After": String(retryAfterSec) },
            }
        )
    }

    b.count += 1
    return null
}

/** Periodic cleanup of stale bucket keys (optional; keeps Map small) */
export function pruneRateBuckets(): void {
    const now = Date.now()
    const w = windowMs()
    for (const [k, b] of buckets) {
        if (now - b.windowStart >= w * 2) buckets.delete(k)
    }
}
