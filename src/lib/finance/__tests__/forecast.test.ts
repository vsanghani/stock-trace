import { describe, expect, it } from "vitest"

import { FORECAST_LLM_JSON_EXAMPLE } from "@/types/forecast"
import type { ForecastSimulationInputs } from "@/types/forecast"

import { normCdf } from "../blackScholes"
import {
    NORM_INV_10,
    NORM_INV_90,
    buildForecastPath,
    clampForecastHorizon,
    gbmMean,
    gbmQuantile,
    simulateForecast,
    validateForecastAssumptions,
    validateForecastSimulationInputs,
    yearsFromDays,
} from "../forecast"

/**
 * Frozen reference matching `FORECAST_LLM_JSON_EXAMPLE` rates at a $100 spot.
 * Numbers were computed independently from the GBM closed form and rounded
 * to 1e-6, the same grid the engine uses.
 *
 *   S0 = 100, μ = 0.10, σ = 0.28, T = 90/252
 */
const AS_OF = "2026-01-02"

const inputs: ForecastSimulationInputs = {
    spot: 100,
    drift: 0.1,
    volatility: 0.28,
    horizonDays: 90,
    seed: 42,
}

const scenarios = FORECAST_LLM_JSON_EXAMPLE.scenarios

describe("yearsFromDays", () => {
    it("converts a 252-day horizon into exactly one year", () => {
        expect(yearsFromDays(252)).toBe(1)
        expect(yearsFromDays(90)).toBeCloseTo(90 / 252, 12)
    })
})

describe("standard normal quantiles", () => {
    it("pairs with the existing CDF at the fan-chart wings", () => {
        expect(normCdf(NORM_INV_10)).toBeCloseTo(0.1, 6)
        expect(normCdf(0)).toBeCloseTo(0.5, 6)
        expect(normCdf(NORM_INV_90)).toBeCloseTo(0.9, 6)
    })
})

describe("gbmQuantile", () => {
    it("collapses to the mean when volatility or time is zero", () => {
        expect(gbmQuantile(100, 0.1, 0, 0.35, NORM_INV_10)).toBeCloseTo(gbmMean(100, 0.1, 0.35), 12)
        expect(gbmQuantile(100, 0.1, 0.28, 0, NORM_INV_90)).toBe(100)
    })

    it("prices a one-year zero-drift 20% vol case", () => {
        expect(gbmQuantile(100, 0, 0.2, 1, 0)).toBeCloseTo(98.01986733067552, 9)
        expect(gbmMean(100, 0, 1)).toBe(100)
        expect(gbmQuantile(100, 0, 0.2, 1, NORM_INV_10)).toBeCloseTo(75.857750, 5)
        expect(gbmQuantile(100, 0, 0.2, 1, NORM_INV_90)).toBeCloseTo(126.656728, 5)
    })
})

describe("simulateForecast — frozen 90-day reference", () => {
    const result = simulateForecast(inputs, scenarios, AS_OF)!

    it("stamps day 0 as the as-of date with every percentile at spot", () => {
        expect(result.path[0]).toEqual({
            date: "2026-01-02",
            day: 0,
            p10: 100,
            p50: 100,
            p90: 100,
        })
    })

    it("emits one sample per calendar day, ending on the horizon date", () => {
        expect(result.path).toHaveLength(91)
        expect(result.path[90]?.date).toBe("2026-04-02")
        expect(result.path[90]?.day).toBe(90)
        expect(result.terminal.date).toBe("2026-04-02")
    })

    it("matches the frozen terminal distribution", () => {
        expect(result.terminal.p10).toBe(82.470436)
        expect(result.terminal.p50).toBe(102.195176)
        expect(result.terminal.p90).toBe(126.637549)
        expect(result.terminal.expected).toBe(103.63597)
        expect(result.terminal.p10Return).toBe(-0.175296)
        expect(result.terminal.p50Return).toBe(0.021952)
        expect(result.terminal.p90Return).toBe(0.266375)
        expect(result.terminal.expectedReturn).toBe(0.03636)
    })

    it("keeps the last path point identical to the terminal percentiles", () => {
        const last = result.path[90]!
        expect(last.p10).toBe(result.terminal.p10)
        expect(last.p50).toBe(result.terminal.p50)
        expect(last.p90).toBe(result.terminal.p90)
    })

    it("matches a frozen interior point at day 30", () => {
        expect(result.path[30]).toMatchObject({
            date: "2026-02-01",
            day: 30,
            p10: 88.996642,
            p50: 100.726435,
            p90: 114.00222,
        })
    })

    it("prices the three scenarios in bear / base / bull order", () => {
        expect(result.terminal.scenarios.map((scenario) => scenario.id)).toEqual([
            "bear",
            "base",
            "bull",
        ])
        expect(result.terminal.scenarios[0]).toMatchObject({
            price: 93.466096,
            returnPct: -0.065339,
            probability: 0.25,
        })
        expect(result.terminal.scenarios[1]).toMatchObject({
            price: 102.195176,
            returnPct: 0.021952,
            probability: 0.5,
        })
        expect(result.terminal.scenarios[2]).toMatchObject({
            price: 111.739491,
            returnPct: 0.117395,
            probability: 0.25,
        })
        expect(result.terminal.scenarios[1]?.price).toBe(result.terminal.p50)
    })

    it("keeps the mean above the median when volatility is positive", () => {
        expect(result.terminal.expected).toBeGreaterThan(result.terminal.p50)
        expect(result.terminal.p10).toBeLessThan(result.terminal.p50)
        expect(result.terminal.p50).toBeLessThan(result.terminal.p90)
    })

    it("ignores the seed: closed-form percentiles do not depend on it", () => {
        const other = simulateForecast({ ...inputs, seed: 99 }, scenarios, AS_OF)!
        expect(other.path).toEqual(result.path)
        expect(other.terminal).toEqual(result.terminal)
    })

    it("is deterministic for the same frozen inputs", () => {
        const again = simulateForecast(inputs, scenarios, AS_OF)!
        expect(again).toEqual(result)
    })

    it("accepts a full ISO timestamp and still stamps dates in UTC", () => {
        const fromTimestamp = simulateForecast(inputs, scenarios, "2026-01-02T15:45:00.000Z")!
        expect(fromTimestamp.path[0]?.date).toBe("2026-01-02")
        expect(fromTimestamp.terminal.date).toBe("2026-04-02")
    })
})

describe("zero volatility", () => {
    it("collapses every percentile onto the mean path", () => {
        const result = simulateForecast(
            { ...inputs, volatility: 0 },
            scenarios.map((scenario) => ({ ...scenario, drift: 0.1 })),
            AS_OF
        )!

        expect(result.terminal.p10).toBe(103.63597)
        expect(result.terminal.p50).toBe(103.63597)
        expect(result.terminal.p90).toBe(103.63597)
        expect(result.terminal.expected).toBe(103.63597)
        expect(result.terminal.scenarios.every((scenario) => scenario.price === 103.63597)).toBe(
            true
        )
    })
})

describe("custom step count", () => {
    it("samples evenly across the horizon, pinning the last day", () => {
        const path = buildForecastPath({ ...inputs, steps: 4 }, AS_OF)!
        expect(path.map((point) => point.day)).toEqual([0, 30, 60, 90])
        expect(path.map((point) => point.date)).toEqual([
            "2026-01-02",
            "2026-02-01",
            "2026-03-03",
            "2026-04-02",
        ])
        expect(path[1]).toMatchObject({ p10: 88.996642, p50: 100.726435, p90: 114.00222 })
    })
})

describe("leap-year date stamping", () => {
    it("counts 29 February when the window includes a leap day", () => {
        const path = buildForecastPath({ ...inputs, horizonDays: 60, steps: 2 }, "2024-01-02")!
        expect(path[1]?.date).toBe("2024-03-02")
    })
})

describe("validateForecastAssumptions", () => {
    it("accepts the canonical LLM fixture", () => {
        expect(validateForecastAssumptions(FORECAST_LLM_JSON_EXAMPLE)).toEqual([])
    })

    it("rejects a missing scenario id", () => {
        const json = {
            ...FORECAST_LLM_JSON_EXAMPLE,
            scenarios: FORECAST_LLM_JSON_EXAMPLE.scenarios.map((scenario, index) =>
                index === 0 ? { ...scenario, id: "base" as const } : scenario
            ),
        }
        expect(validateForecastAssumptions(json)).toContain("missing-scenario")
    })

    it("rejects probabilities that do not sum to one", () => {
        const json = {
            ...FORECAST_LLM_JSON_EXAMPLE,
            scenarios: FORECAST_LLM_JSON_EXAMPLE.scenarios.map((scenario) => ({
                ...scenario,
                probability: 0.5,
            })),
        }
        expect(validateForecastAssumptions(json)).toContain("probabilities-not-unit")
    })

    it("rejects a blank thesis and negative volatility", () => {
        const json = { ...FORECAST_LLM_JSON_EXAMPLE, thesis: "   ", volatility: -0.1 }
        expect(validateForecastAssumptions(json)).toEqual(
            expect.arrayContaining(["invalid-thesis", "invalid-volatility"])
        )
    })
})

describe("validateForecastSimulationInputs", () => {
    it("accepts the frozen reference", () => {
        expect(validateForecastSimulationInputs(inputs)).toEqual([])
    })

    it("rejects a non-positive spot and horizon", () => {
        expect(validateForecastSimulationInputs({ ...inputs, spot: 0 })).toEqual(["invalid-spot"])
        expect(validateForecastSimulationInputs({ ...inputs, horizonDays: -5 })).toEqual([
            "invalid-horizon",
        ])
    })

    it("makes simulateForecast return null rather than throw", () => {
        expect(simulateForecast({ ...inputs, spot: -1 }, scenarios, AS_OF)).toBeNull()
        expect(simulateForecast(inputs, scenarios.slice(0, 2), AS_OF)).toBeNull()
    })
})

describe("clampForecastHorizon", () => {
    it("pins out-of-range values to the contract bounds", () => {
        expect(clampForecastHorizon(90)).toBe(90)
        expect(clampForecastHorizon(1)).toBe(7)
        expect(clampForecastHorizon(400)).toBe(365)
        expect(clampForecastHorizon(Number.NaN)).toBe(90)
    })
})
