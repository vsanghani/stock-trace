import { NextResponse } from "next/server"

import { getServerEnv } from "@/lib/env.server"
import { fetchWithTimeout } from "@/lib/api/upstream"

export interface RateLimitPolicy {
    name: string
    limit: number
    windowMs: number
}

export interface RateLimitDecision {
    allowed: boolean
    limit: number
    remaining: number
    retryAfterSeconds: number
}

export interface SlidingWindowStore {
    hit(key: string, limit: number, windowMs: number, now: number): Promise<RateLimitDecision>
}

/** Public autocomplete. Still calls Yahoo, so it is limited. */
export const SEARCH_RATE_LIMIT: RateLimitPolicy = { name: "search", limit: 60, windowMs: 60_000 }

/** Quotes, options, and fundamentals. */
export const MARKET_RATE_LIMIT: RateLimitPolicy = { name: "market", limit: 30, windowMs: 60_000 }

/** OpenRouter and other paid-upstream routes. */
export const AI_RATE_LIMIT: RateLimitPolicy = { name: "ai", limit: 10, windowMs: 60_000 }

export function rateLimitPolicyForPath(pathname: string): RateLimitPolicy {
    if (pathname.startsWith("/api/sentiment")) return AI_RATE_LIMIT
    if (pathname.startsWith("/api/search")) return SEARCH_RATE_LIMIT
    return MARKET_RATE_LIMIT
}

/**
 * Sliding window over timestamps. A request at the exact end of the window
 * does not count the event that opened the window.
 */
export function takeSlidingWindow(
    stamps: readonly number[],
    limit: number,
    windowMs: number,
    now: number
): { stamps: number[]; decision: RateLimitDecision } {
    const threshold = now - windowMs
    const active = stamps.filter((stamp) => stamp > threshold).sort((a, b) => a - b)
    if (active.length >= limit) {
        const oldest = active[0] ?? now
        const retryMs = Math.max(0, oldest + windowMs - now)
        return {
            stamps: active,
            decision: {
                allowed: false,
                limit,
                remaining: 0,
                retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)),
            },
        }
    }

    const next = [...active, now]
    return {
        stamps: next,
        decision: {
            allowed: true,
            limit,
            remaining: limit - next.length,
            retryAfterSeconds: 0,
        },
    }
}

export class MemorySlidingWindow implements SlidingWindowStore {
    private readonly buckets = new Map<string, number[]>()

    constructor(private readonly maxKeys = 5_000) {}

    async hit(key: string, limit: number, windowMs: number, now: number): Promise<RateLimitDecision> {
        this.prune(now, windowMs)
        const current = this.buckets.get(key) ?? []
        const next = takeSlidingWindow(current, limit, windowMs, now)
        if (next.stamps.length === 0) this.buckets.delete(key)
        else this.buckets.set(key, next.stamps)
        return next.decision
    }

    private prune(now: number, windowMs: number) {
        if (this.buckets.size <= this.maxKeys) return
        const threshold = now - windowMs
        for (const [key, stamps] of this.buckets) {
            if (!stamps.some((stamp) => stamp > threshold)) this.buckets.delete(key)
        }
        while (this.buckets.size > this.maxKeys) {
            const oldest = this.buckets.keys().next().value
            if (oldest === undefined) break
            this.buckets.delete(oldest)
        }
    }
}

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = tonumber(redis.call('ZCARD', key))
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry = window
  if oldest[2] ~= nil then
    retry = tonumber(oldest[2]) + window - now
  end
  if retry < 1 then retry = 1 end
  return {0, count, retry}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, math.floor(window))
return {1, count + 1, 0}
`

export function decisionFromUpstash(result: unknown, limit: number): RateLimitDecision | null {
    if (!Array.isArray(result) || result.length < 3) return null
    const allowedFlag = Number(result[0])
    const count = Number(result[1])
    const retryMs = Number(result[2])
    if ((allowedFlag !== 0 && allowedFlag !== 1) || !Number.isFinite(count) || !Number.isFinite(retryMs)) {
        return null
    }
    const allowed = allowedFlag === 1
    return {
        allowed,
        limit,
        remaining: allowed ? Math.max(0, limit - count) : 0,
        retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(retryMs / 1000)),
    }
}

export class UpstashSlidingWindow implements SlidingWindowStore {
    constructor(
        private readonly url: string,
        private readonly token: string,
        private readonly fallback: SlidingWindowStore,
        private readonly fetchImpl: typeof fetch = fetch
    ) {}

    async hit(key: string, limit: number, windowMs: number, now: number): Promise<RateLimitDecision> {
        const member = `${now}:${Math.random().toString(16).slice(2)}`
        try {
            const response = await fetchWithTimeout(
                this.url,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify([
                        "EVAL",
                        SLIDING_WINDOW_SCRIPT,
                        "1",
                        key,
                        String(now),
                        String(windowMs),
                        String(limit),
                        member,
                    ]),
                },
                1_500,
                this.fetchImpl
            )
            if (!response.ok) throw new Error("upstash status")
            const payload = (await response.json()) as { result?: unknown }
            const decision = decisionFromUpstash(payload.result, limit)
            if (!decision) throw new Error("upstash payload")
            return decision
        } catch {
            warnUpstashOnce()
            return this.fallback.hit(key, limit, windowMs, now)
        }
    }
}

let upstashWarned = false

function warnUpstashOnce() {
    if (upstashWarned) return
    upstashWarned = true
    console.warn("[plutox] Upstash rate limit request failed; using the in-memory window for this process.")
}

let memoryStore: MemorySlidingWindow | undefined
let upstashStore: UpstashSlidingWindow | undefined
let upstashIdentity = ""

export function getMemoryRateLimitStore(): MemorySlidingWindow {
    memoryStore ??= new MemorySlidingWindow()
    return memoryStore
}

export function getRateLimitStore(): SlidingWindowStore {
    const env = getServerEnv()
    const url = env.UPSTASH_REDIS_REST_URL
    const token = env.UPSTASH_REDIS_REST_TOKEN
    if (url && token) {
        const identity = `${url}\n${token}`
        if (!upstashStore || upstashIdentity !== identity) {
            upstashIdentity = identity
            upstashStore = new UpstashSlidingWindow(url, token, getMemoryRateLimitStore())
        }
        return upstashStore
    }
    return getMemoryRateLimitStore()
}

export function resetRateLimitForTests(): void {
    memoryStore = undefined
    upstashStore = undefined
    upstashIdentity = ""
    upstashWarned = false
}

export function clientAddress(request: Request): string {
    const realIp = request.headers.get("x-real-ip")?.trim()
    if (realIp) return realIp.slice(0, 64)
    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim()
        if (first) return first.slice(0, 64)
    }
    return "unknown"
}

function userKey(userId: string | null | undefined): string | null {
    if (!userId) return null
    return /^[A-Za-z0-9_]{1,128}$/.test(userId) ? userId : null
}

export function rateLimitResponse(decision: RateLimitDecision): NextResponse {
    return NextResponse.json(
        { error: "Too many requests" },
        {
            status: 429,
            headers: {
                "Retry-After": String(decision.retryAfterSeconds),
                "Cache-Control": "no-store",
            },
        }
    )
}

/**
 * Limits by IP, and also by user id when the caller passes one.
 * Returns a 429 response, or null when the request may proceed.
 */
export async function enforceRateLimit(
    request: Request,
    policy: RateLimitPolicy,
    options?: { userId?: string | null; store?: SlidingWindowStore; now?: number }
): Promise<NextResponse | null> {
    const store = options?.store ?? getRateLimitStore()
    const now = options?.now ?? Date.now()
    const identities = [`ip:${clientAddress(request)}`]
    const userId = userKey(options?.userId)
    if (userId) identities.push(`user:${userId}`)

    for (const identity of identities) {
        const decision = await store.hit(`${policy.name}:${identity}`, policy.limit, policy.windowMs, now)
        if (!decision.allowed) return rateLimitResponse(decision)
    }
    return null
}
