import { afterEach, describe, expect, it, vi } from "vitest"

import { GET } from "@/app/api/health/route"
import { HEALTH_RATE_LIMIT, rateLimitPolicyForPath } from "@/lib/api/rate-limit"

describe("GET /api/health", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("returns ok without calling fetch or reading the database", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch")
        const response = await GET(new Request("http://localhost:3000/api/health"))

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ ok: true })
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it("is rate-limited on the same path as the other API routes", () => {
        expect(rateLimitPolicyForPath("/api/health")).toEqual(HEALTH_RATE_LIMIT)
        expect(HEALTH_RATE_LIMIT.limit).toBeGreaterThan(0)
        expect(HEALTH_RATE_LIMIT.windowMs).toBeGreaterThan(0)
    })
})
