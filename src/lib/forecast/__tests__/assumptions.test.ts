import { afterEach, describe, expect, it, vi } from "vitest"

import { FORECAST_LLM_JSON_EXAMPLE } from "@/types/forecast"
import type { ForecastLlmContext } from "@/types/forecast"
import { validateForecastAssumptions } from "@/lib/finance"

import {
    DEFAULT_FALLBACK_VOLATILITY,
    FORECAST_LLM_MODEL,
    FORECAST_LLM_MODEL_NONE,
    buildFallbackAssumptions,
    buildForecastPrompts,
    fetchForecastAssumptions,
    parseForecastLlmJson,
} from "../assumptions"

const context: ForecastLlmContext = {
    ticker: "AAPL",
    companyName: "Apple Inc.",
    currency: "USD",
    spot: 100,
    horizonDays: 90,
    realizedVolatility: 0.28,
    beta: 1.2,
    analystMeanTarget: 110,
    dcfFairValue: 95,
    sentimentScore: 62,
    sentimentReason: "Mildly constructive.",
    recentHeadlines: ["Apple beats earnings"],
}

function jsonCompletion(content: string, ok = true, status = 200) {
    return {
        ok,
        status,
        json: async () => ({
            choices: [{ message: { content } }],
        }),
    }
}

afterEach(() => {
    vi.restoreAllMocks()
})

describe("parseForecastLlmJson", () => {
    it("accepts the canonical fixture", () => {
        const parsed = parseForecastLlmJson(JSON.stringify(FORECAST_LLM_JSON_EXAMPLE))
        expect(parsed).toEqual(FORECAST_LLM_JSON_EXAMPLE)
        expect(validateForecastAssumptions(parsed!)).toEqual([])
    })

    it("strips markdown fences and surrounding prose", () => {
        const wrapped = [
            "Here you go:",
            "```json",
            JSON.stringify(FORECAST_LLM_JSON_EXAMPLE),
            "```",
            "Good luck.",
        ].join("\n")
        expect(parseForecastLlmJson(wrapped)).toEqual(FORECAST_LLM_JSON_EXAMPLE)
    })

    it("coerces percent-scale rates and probabilities", () => {
        const percentScale = {
            drift: 10,
            volatility: 28,
            thesis: FORECAST_LLM_JSON_EXAMPLE.thesis,
            scenarios: FORECAST_LLM_JSON_EXAMPLE.scenarios.map((scenario) => ({
                ...scenario,
                drift: scenario.drift * 100,
                probability: scenario.probability * 100,
            })),
        }
        expect(parseForecastLlmJson(JSON.stringify(percentScale))).toEqual(FORECAST_LLM_JSON_EXAMPLE)
    })

    it("fills a missing top-level drift from the base scenario", () => {
        const { drift: _ignored, ...withoutDrift } = FORECAST_LLM_JSON_EXAMPLE
        const parsed = parseForecastLlmJson(JSON.stringify(withoutDrift))
        expect(parsed?.drift).toBe(0.1)
    })

    it("returns null for a missing scenario or invalid JSON", () => {
        const missingBear = {
            ...FORECAST_LLM_JSON_EXAMPLE,
            scenarios: FORECAST_LLM_JSON_EXAMPLE.scenarios.slice(1),
        }
        expect(parseForecastLlmJson(JSON.stringify(missingBear))).toBeNull()
        expect(parseForecastLlmJson("not json")).toBeNull()
        expect(parseForecastLlmJson("")).toBeNull()
    })
})

describe("buildFallbackAssumptions", () => {
    it("uses realized vol and the analyst target as a 12-month drift", () => {
        const assumptions = buildFallbackAssumptions(context)
        expect(validateForecastAssumptions(assumptions)).toEqual([])
        expect(assumptions.volatility).toBe(0.28)
        expect(assumptions.drift).toBe(0.1)
        expect(assumptions.scenarios.map((scenario) => scenario.drift)).toEqual([-0.18, 0.1, 0.38])
        expect(assumptions.thesis).toContain("AAPL")
        expect(assumptions.thesis).toContain("no LLM view")
    })

    it("defaults vol and uses zero drift when anchors are missing", () => {
        const assumptions = buildFallbackAssumptions({
            ...context,
            realizedVolatility: null,
            analystMeanTarget: null,
        })
        expect(assumptions.volatility).toBe(DEFAULT_FALLBACK_VOLATILITY)
        expect(assumptions.drift).toBe(0)
        expect(assumptions.scenarios.map((scenario) => scenario.drift)).toEqual([-0.25, 0, 0.25])
    })
})

describe("buildForecastPrompts", () => {
    it("shows the JSON contract and the market context", () => {
        const { system, user } = buildForecastPrompts(context)
        expect(system).toContain('"drift"')
        expect(system).toContain("Return ONLY a single JSON object")
        expect(system).toContain("no dollar prices, no price path")
        expect(user).toContain("AAPL")
        expect(user).toContain("realizedVolatility: 0.28")
        expect(user).toContain("Apple beats earnings")
    })
})

describe("fetchForecastAssumptions", () => {
    it("skips the network and uses the mock when no key is configured", async () => {
        const fetchImpl = vi.fn()
        const result = await fetchForecastAssumptions(context, { apiKey: null, fetchImpl })

        expect(fetchImpl).not.toHaveBeenCalled()
        expect(result.source).toBe("historical-fallback")
        expect(result.model).toBe(FORECAST_LLM_MODEL_NONE)
        expect(result.assumptions).toEqual(buildFallbackAssumptions(context))
    })

    it("returns parsed LLM assumptions when OpenRouter succeeds", async () => {
        const fetchImpl = vi.fn().mockResolvedValue(
            jsonCompletion(JSON.stringify(FORECAST_LLM_JSON_EXAMPLE))
        )

        const result = await fetchForecastAssumptions(context, { apiKey: "test-key", fetchImpl })

        expect(result.source).toBe("llm")
        expect(result.model).toBe(FORECAST_LLM_MODEL)
        expect(result.assumptions).toEqual(FORECAST_LLM_JSON_EXAMPLE)
        expect(fetchImpl).toHaveBeenCalledTimes(1)

        const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
        const body = JSON.parse(String(init.body))
        expect(body.model).toBe(FORECAST_LLM_MODEL)
        expect(init.headers).toMatchObject({ Authorization: "Bearer test-key" })
    })

    it("falls back when OpenRouter errors or returns unusable JSON", async () => {
        const errorFetch = vi.fn().mockResolvedValue(jsonCompletion("", false, 500))
        const badJson = vi.fn().mockResolvedValue(jsonCompletion("sorry, no json"))

        const fromError = await fetchForecastAssumptions(context, {
            apiKey: "test-key",
            fetchImpl: errorFetch,
        })
        const fromBadJson = await fetchForecastAssumptions(context, {
            apiKey: "test-key",
            fetchImpl: badJson,
        })

        expect(fromError.source).toBe("historical-fallback")
        expect(fromBadJson.source).toBe("historical-fallback")
        expect(fromError.assumptions).toEqual(buildFallbackAssumptions(context))
    })
})
