import { afterEach, describe, expect, it, vi } from "vitest"

import {
    AI_RATE_LIMIT,
    MemorySlidingWindow,
    UpstashSlidingWindow,
    clientAddress,
    decisionFromUpstash,
    enforceRateLimit,
    rateLimitPolicyForPath,
    resetRateLimitForTests,
    takeSlidingWindow,
} from "@/lib/api/rate-limit"

describe("sliding window", () => {
    it("allows requests inside the limit and blocks the next one", () => {
        const now = 1_000_000
        let stamps: number[] = []
        for (let i = 0; i < 3; i += 1) {
            const step = takeSlidingWindow(stamps, 3, 10_000, now + i)
            stamps = step.stamps
            expect(step.decision.allowed).toBe(true)
            expect(step.decision.remaining).toBe(2 - i)
        }
        const blocked = takeSlidingWindow(stamps, 3, 10_000, now + 3)
        expect(blocked.decision.allowed).toBe(false)
        expect(blocked.decision.retryAfterSeconds).toBeGreaterThan(0)
    })

    it("expires events that fall outside the window", () => {
        const first = takeSlidingWindow([], 1, 1_000, 0)
        const blocked = takeSlidingWindow(first.stamps, 1, 1_000, 500)
        expect(blocked.decision.allowed).toBe(false)
        const later = takeSlidingWindow(blocked.stamps, 1, 1_000, 1_000)
        expect(later.decision.allowed).toBe(true)
    })
})

describe("memory rate limiter", () => {
    it("tracks keys independently", async () => {
        const store = new MemorySlidingWindow()
        const policy = { name: "market", limit: 1, windowMs: 60_000 }
        expect((await store.hit("market:ip:a", policy.limit, policy.windowMs, 10)).allowed).toBe(true)
        expect((await store.hit("market:ip:a", policy.limit, policy.windowMs, 11)).allowed).toBe(false)
        expect((await store.hit("market:ip:b", policy.limit, policy.windowMs, 12)).allowed).toBe(true)
    })
})

describe("enforceRateLimit", () => {
    afterEach(() => {
        resetRateLimitForTests()
    })

    it("returns 429 with Retry-After and no client address", async () => {
        const store = new MemorySlidingWindow()
        const request = new Request("http://localhost/api/sentiment/AAPL", {
            headers: { "x-real-ip": "203.0.113.10" },
        })
        expect(clientAddress(request)).toBe("203.0.113.10")
        expect(rateLimitPolicyForPath("/api/sentiment/AAPL")).toBe(AI_RATE_LIMIT)

        for (let i = 0; i < AI_RATE_LIMIT.limit; i += 1) {
            const allowed = await enforceRateLimit(request, AI_RATE_LIMIT, {
                store,
                userId: "user_123",
                now: 5_000 + i,
            })
            expect(allowed).toBeNull()
        }

        const blocked = await enforceRateLimit(request, AI_RATE_LIMIT, {
            store,
            userId: "user_123",
            now: 5_000 + AI_RATE_LIMIT.limit,
        })
        expect(blocked?.status).toBe(429)
        expect(blocked?.headers.get("Retry-After")).toMatch(/^[1-9]\d*$/)
        const body = await blocked?.json()
        expect(body).toEqual({ error: "Too many requests" })
        expect(JSON.stringify(body)).not.toContain("203.0.113.10")
        expect(JSON.stringify(body)).not.toContain("user_123")
    })

    it("limits a signed-in user separately from their IP", async () => {
        const store = new MemorySlidingWindow()
        const request = new Request("http://localhost/api/stock", {
            headers: { "x-forwarded-for": "198.51.100.4, 10.0.0.1" },
        })
        const policy = { name: "market", limit: 1, windowMs: 60_000 }
        expect(await enforceRateLimit(request, policy, { store, userId: "user_a", now: 1 })).toBeNull()
        const blockedUser = await enforceRateLimit(request, policy, { store, userId: "user_a", now: 2 })
        expect(blockedUser?.status).toBe(429)

        const otherUserSameIp = await enforceRateLimit(request, policy, { store, userId: "user_b", now: 3 })
        expect(otherUserSameIp?.status).toBe(429)
    })
})

describe("Upstash adapter", () => {
    it("maps a denied Redis result to Retry-After seconds", () => {
        expect(decisionFromUpstash([0, 10, 1500], 10)).toMatchObject({
            allowed: false,
            retryAfterSeconds: 2,
            remaining: 0,
        })
        expect(decisionFromUpstash([1, 1, 0], 10)?.allowed).toBe(true)
        expect(decisionFromUpstash({ nope: true }, 10)).toBeNull()
    })

    it("uses the Redis decision when the REST call succeeds", async () => {
        const fetchImpl = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ result: [0, 10, 5_000] }),
        })
        const fallback = new MemorySlidingWindow()
        const store = new UpstashSlidingWindow("https://example.upstash.io", "token", fallback, fetchImpl)
        const decision = await store.hit("market:ip:1", 10, 60_000, 20)
        expect(decision.allowed).toBe(false)
        expect(decision.retryAfterSeconds).toBe(5)
        expect(fetchImpl).toHaveBeenCalledOnce()
        const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
        expect(init.headers).toMatchObject({ Authorization: "Bearer token" })
        const command = JSON.parse(String(init.body)) as unknown[]
        expect(command[0]).toBe("EVAL")
        expect(JSON.stringify(command)).not.toContain("sk_")
    })

    it("falls back to memory when Redis is unreachable", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
        const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"))
        const fallback = new MemorySlidingWindow()
        const store = new UpstashSlidingWindow("https://example.upstash.io", "token", fallback, fetchImpl)
        const decision = await store.hit("search:ip:1", 2, 60_000, 30)
        expect(decision.allowed).toBe(true)
        expect(warn).toHaveBeenCalledOnce()
        warn.mockRestore()
    })
})
