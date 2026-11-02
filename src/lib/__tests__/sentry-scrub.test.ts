import { describe, expect, it } from "vitest"

import { scrubSentryEvent } from "@/lib/sentry-scrub"
import { securityHeaders } from "@/lib/security-headers"

describe("sentry scrubber", () => {
    it("removes auth headers, cookies, and query tokens", () => {
        const event = scrubSentryEvent({
            request: {
                url: "https://plutox.site/api/stock?ticker=AAPL&access_token=sekret",
                headers: {
                    Authorization: "Bearer sekret",
                    Cookie: "session=sekret",
                    "X-Request-Id": "abc",
                },
                cookies: { session: "sekret" },
                query_string: "ticker=AAPL&token=sekret",
            },
            breadcrumbs: [{ data: { url: "https://plutox.site/?api_key=sekret", cookie: "session=sekret" } }],
        })

        expect(event.request?.headers?.Authorization).toBe("[Scrubbed]")
        expect(event.request?.headers?.Cookie).toBe("[Scrubbed]")
        expect(event.request?.headers?.["X-Request-Id"]).toBe("abc")
        expect(event.request?.cookies).toEqual({})
        expect(event.request?.url).toContain("ticker=AAPL")
        expect(event.request?.url).not.toContain("sekret")
        expect(event.request?.query_string).not.toContain("sekret")
        expect(JSON.stringify(event.breadcrumbs)).not.toContain("sekret")
    })
})

describe("security headers", () => {
    it("sets a report-only policy and blocks framing", () => {
        const headers = Object.fromEntries(securityHeaders().map((header) => [header.key, header.value]))
        expect(headers["Content-Security-Policy-Report-Only"]).toContain("default-src 'self'")
        expect(headers["Content-Security-Policy-Report-Only"]).toContain("frame-ancestors 'none'")
        expect(headers["Content-Security-Policy"]).toBe("frame-ancestors 'none'")
        expect(headers["Strict-Transport-Security"]).toContain("max-age=")
        expect(headers["X-Content-Type-Options"]).toBe("nosniff")
        expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin")
        expect(headers["X-Frame-Options"]).toBe("DENY")
    })
})
