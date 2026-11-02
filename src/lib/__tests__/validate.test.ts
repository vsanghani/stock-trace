import { describe, expect, it } from "vitest"

import {
    absentBodySchema,
    firstQueryValues,
    invalidRequest,
    optionsQuerySchema,
    parseJsonBody,
    parseWithSchema,
    searchQuerySchema,
    stockQuerySchema,
    tickerParamsSchema,
} from "@/lib/api/validate"

describe("request validation", () => {
    it("accepts a ticker after trimming and uppercasing", () => {
        const parsed = parseWithSchema(tickerParamsSchema, { ticker: " aapl " })
        expect(parsed.ok).toBe(true)
        if (parsed.ok) expect(parsed.data.ticker).toBe("AAPL")
    })

    it("accepts dotted and dashed symbols within 10 characters", () => {
        expect(parseWithSchema(stockQuerySchema, { ticker: "brk.b" }).ok).toBe(true)
        expect(parseWithSchema(stockQuerySchema, { ticker: "bhp.ax" }).ok).toBe(true)
    })

    it("returns a 400 that does not echo the raw value", async () => {
        const raw = "<script>alert(1)</script>"
        const parsed = parseWithSchema(stockQuerySchema, { ticker: raw })
        expect(parsed.ok).toBe(false)
        if (parsed.ok) return
        expect(parsed.response.status).toBe(400)
        const body = await parsed.response.json()
        expect(body).toEqual({ error: "Invalid request", fields: ["ticker"] })
        expect(JSON.stringify(body)).not.toContain(raw)
        expect(JSON.stringify(body)).not.toContain("script")
    })

    it("rejects an index caret and an over-long symbol", () => {
        expect(parseWithSchema(tickerParamsSchema, { ticker: "^GSPC" }).ok).toBe(false)
        expect(parseWithSchema(tickerParamsSchema, { ticker: "TOOLONGTICKER" }).ok).toBe(false)
    })

    it("allows a normal search and rejects control characters", () => {
        const ok = parseWithSchema(searchQuerySchema, { q: "Bank of America" })
        expect(ok.ok).toBe(true)
        if (ok.ok) expect(ok.data.q).toBe("Bank of America")

        const blank = parseWithSchema(searchQuerySchema, {})
        expect(blank.ok).toBe(true)

        const hostile = parseWithSchema(searchQuerySchema, { q: "AAPL\u0000" })
        expect(hostile.ok).toBe(false)
    })

    it("accepts an ISO expiry and rejects a free-form date", () => {
        const iso = parseWithSchema(optionsQuerySchema, {
            ticker: "AAPL",
            date: "2026-11-20T00:00:00.000Z",
        })
        expect(iso.ok).toBe(true)

        const day = parseWithSchema(optionsQuerySchema, { ticker: "AAPL", date: "2026-11-20" })
        expect(day.ok).toBe(true)

        const junk = parseWithSchema(optionsQuerySchema, { ticker: "AAPL", date: "next friday" })
        expect(junk.ok).toBe(false)
        if (!junk.ok) {
            return junk.response.json().then((body) => {
                expect(body.fields).toEqual(["date"])
                expect(JSON.stringify(body)).not.toContain("friday")
            })
        }
    })

    it("reads the first query value", () => {
        const request = new Request("http://localhost/api/stock?ticker=msft&extra=1")
        expect(firstQueryValues(request)).toEqual({ ticker: "msft", extra: "1" })
    })

    it("validates a JSON body and hides malformed input", async () => {
        const schema = tickerParamsSchema
        const good = new Request("http://localhost/api/stock", {
            method: "POST",
            body: JSON.stringify({ ticker: "nvda" }),
        })
        const parsed = await parseJsonBody(good, schema)
        expect(parsed.ok).toBe(true)
        if (parsed.ok) expect(parsed.data.ticker).toBe("NVDA")

        const malformed = new Request("http://localhost/api/stock", {
            method: "POST",
            body: "{not json",
        })
        const failed = await parseJsonBody(malformed, schema)
        expect(failed.ok).toBe(false)
        if (!failed.ok) {
            expect(await failed.response.json()).toEqual({ error: "Invalid request", fields: ["body"] })
        }

        const get = new Request("http://localhost/api/stock")
        const absent = await parseJsonBody(get, absentBodySchema)
        expect(absent.ok).toBe(true)
    })

    it("builds the shared 400 response", async () => {
        const response = invalidRequest(["query"])
        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: "Invalid request", fields: ["query"] })
    })
})
