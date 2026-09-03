import { describe, expect, it } from "vitest"

import { buildSensitivityMatrix, calculateDcf } from "../valuation"
import type { DcfInputs } from "../types"

/**
 * A real snapshot from `/api/valuation/AAPL`, kept as a guard against unit
 * scaling mistakes. Dollars, share counts, and rates all have to line up for
 * the per-share figure to land anywhere near the market price.
 */
const apple: DcfInputs = {
    freeCashFlow: 98_767_000_000,
    sharesOutstanding: 14_594_180_000,
    netDebt: 21_944_995_840,
    currentPrice: 324.96,
    assumptions: { growthRate: 0, discountRate: 0.09, terminalGrowthRate: 0.025, years: 5 },
}

describe("realistic company snapshot", () => {
    it("values a megacap in dollars per share, not billions", () => {
        const result = calculateDcf(apple)!

        expect(result.fairValuePerShare).toBeCloseTo(94.18, 1)
        expect(result.marginOfSafety).toBeCloseTo(-71, 0)
        expect(result.verdict).toBe("overvalued")
    })

    it("keeps the terminal value below the dominance warning threshold", () => {
        const result = calculateDcf(apple)!

        expect(result.terminalValueWeight).toBeCloseTo(0.725, 3)
        expect(result.warnings).toEqual([])
    })

    it("solves every cell of the default sensitivity grid", () => {
        const matrix = buildSensitivityMatrix(apple)
        const solved = matrix.rows.flat().filter((cell) => cell.fairValuePerShare !== null)

        expect(solved).toHaveLength(25)
        expect(matrix.minFairValue).toBeLessThan(matrix.maxFairValue!)
    })
})
