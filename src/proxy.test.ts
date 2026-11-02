import { afterEach, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import proxy from "@/proxy"

const CLERK_KEYS = ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"] as const

const env = process.env as Record<string, string | undefined>
const original = Object.fromEntries(CLERK_KEYS.map((key) => [key, env[key]]))

function restoreEnv() {
    for (const key of CLERK_KEYS) {
        const value = original[key]
        if (value === undefined) delete env[key]
        else env[key] = value
    }
}

function request(path: string) {
    return new NextRequest(new URL(path, "http://localhost:3000"))
}

async function run(path: string) {
    const response = await proxy(request(path), undefined as never)
    if (!response) throw new Error(`proxy returned no response for ${path}`)
    return response
}

describe("proxy without clerk keys", () => {
    afterEach(() => {
        restoreEnv()
    })

    it("lets public routes through and refuses protected routes", async () => {
        delete env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        delete env.CLERK_SECRET_KEY

        for (const path of ["/", "/?ticker=AAPL", "/blog", "/blog/hello", "/about", "/company", "/privacy", "/terms", "/api/search", "/api/health", "/api/health?ready=1"]) {
            const response = await run(path)
            expect(response.status, path).toBe(200)
            expect(response.headers.get("x-middleware-next"), path).toBe("1")
        }

        for (const path of ["/sign-in", "/sign-up", "/sign-in/factor-one"]) {
            const response = await run(path)
            expect(response.status, path).toBe(200)
            expect(response.headers.get("x-middleware-next"), path).toBe("1")
        }

        for (const path of ["/dashboard", "/dashboard?ticker=AAPL", "/options", "/valuation", "/pnl-calculator", "/robots.txt", "/sitemap.xml"]) {
            const response = await run(path)
            expect(response.status, path).toBe(503)
            expect(response.headers.get("content-type"), path).toContain("text/html")
            expect(await response.text()).toContain("Auth is not configured.")
            expect(response.headers.get("x-middleware-next")).toBeNull()
        }

        for (const path of ["/api/stock?ticker=AAPL", "/api/options", "/api/valuation/AAPL", "/api/sentiment/AAPL"]) {
            const response = await run(path)
            expect(response.status, path).toBe(503)
            expect(await response.json()).toEqual({ error: "auth not configured" })
        }
    })

    it("fails closed when only one clerk key is set", async () => {
        env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k"
        delete env.CLERK_SECRET_KEY
        const missingSecret = await run("/api/stock")
        expect(missingSecret.status).toBe(503)
        expect(await missingSecret.json()).toEqual({ error: "auth not configured" })

        delete env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        env.CLERK_SECRET_KEY = "sk_test_dummy"
        const missingPublishable = await run("/dashboard")
        expect(missingPublishable.status).toBe(503)
        expect(await missingPublishable.text()).toContain("Auth is not configured.")

        env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "   "
        env.CLERK_SECRET_KEY = "   "
        const blank = await run("/api/options")
        expect(blank.status).toBe(503)
        expect(await blank.json()).toEqual({ error: "auth not configured" })
    })
})
