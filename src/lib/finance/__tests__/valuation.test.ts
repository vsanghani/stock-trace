import { describe, expect, it } from "vitest"

import {
    DEFAULT_DCF_ASSUMPTIONS,
    buildSensitivityMatrix,
    cagr,
    calculateDcf,
    calculateTerminalValue,
    classifyVerdict,
    discountFactor,
    historicalGrowthRate,
    marginOfSafety,
    presentValue,
    projectFreeCashFlows,
    validateDcfInputs,
} from "../valuation"
import type { DcfInputs } from "../types"

/**
 * Reference case chosen so the arithmetic is exact by hand:
 * growth equals the discount rate, so each year discounts back to 100 and the
 * five-year present value is 500. Terminal growth of zero makes the terminal
 * value 1,610.51, which discounts to exactly 1,000, giving a 1,500 enterprise
 * value and a 15.00 fair value across 100 shares.
 */
const reference: DcfInputs = {
    freeCashFlow: 100,
    sharesOutstanding: 100,
    netDebt: 0,
    currentPrice: 10,
    assumptions: {
        growthRate: 0.1,
        discountRate: 0.1,
        terminalGrowthRate: 0,
        years: 5,
    },
}

describe("projectFreeCashFlows", () => {
    it("compounds the base cash flow across the horizon", () => {
        const projected = projectFreeCashFlows(100, 0.1, 5)
        expect(projected).toHaveLength(5)
        expect(projected[0]).toBeCloseTo(110, 6)
        expect(projected[4]).toBeCloseTo(161.051, 6)
    })

    it("shrinks the series when growth is negative", () => {
        const projected = projectFreeCashFlows(100, -0.05, 3)
        expect(projected[2]).toBeCloseTo(85.7375, 6)
    })

    it("defaults to a five year horizon", () => {
        expect(projectFreeCashFlows(100, 0.05)).toHaveLength(5)
    })
})

describe("discounting", () => {
    it("discounts a future dollar back to today", () => {
        expect(discountFactor(0.1, 1)).toBeCloseTo(0.909091, 6)
        expect(presentValue(161.051, 0.1, 5)).toBeCloseTo(100, 6)
    })
})

describe("calculateTerminalValue", () => {
    it("capitalises the final cash flow at the spread", () => {
        expect(calculateTerminalValue(161.051, 0.1, 0)).toBeCloseTo(1610.51, 6)
        expect(calculateTerminalValue(100, 0.1, 0.02)).toBeCloseTo(1275, 6)
    })

    it("refuses to solve when the perpetuity does not converge", () => {
        expect(calculateTerminalValue(100, 0.05, 0.05)).toBeNull()
        expect(calculateTerminalValue(100, 0.03, 0.05)).toBeNull()
    })
})

describe("marginOfSafety", () => {
    it("expresses the gap as a percentage of the market price", () => {
        expect(marginOfSafety(15, 10)).toBeCloseTo(50, 9)
        expect(marginOfSafety(10, 15)).toBeCloseTo(-33.3333, 3)
        expect(marginOfSafety(10, 10)).toBe(0)
    })

    it("stays finite when the price is missing", () => {
        expect(marginOfSafety(15, 0)).toBe(0)
    })
})

describe("classifyVerdict", () => {
    it("keeps a neutral band around fair value", () => {
        expect(classifyVerdict(50)).toBe("undervalued")
        expect(classifyVerdict(10)).toBe("fairly-valued")
        expect(classifyVerdict(0)).toBe("fairly-valued")
        expect(classifyVerdict(-10)).toBe("fairly-valued")
        expect(classifyVerdict(-50)).toBe("overvalued")
    })
})

describe("calculateDcf", () => {
    it("solves the reference case exactly", () => {
        const result = calculateDcf(reference)
        expect(result).not.toBeNull()

        expect(result!.pvOfCashFlows).toBeCloseTo(500, 6)
        expect(result!.terminalValue).toBeCloseTo(1610.51, 6)
        expect(result!.pvOfTerminalValue).toBeCloseTo(1000, 6)
        expect(result!.enterpriseValue).toBeCloseTo(1500, 6)
        expect(result!.equityValue).toBeCloseTo(1500, 6)
        expect(result!.fairValuePerShare).toBeCloseTo(15, 6)
        expect(result!.marginOfSafety).toBeCloseTo(50, 6)
        expect(result!.verdict).toBe("undervalued")
        expect(result!.terminalValueWeight).toBeCloseTo(2 / 3, 6)
    })

    it("returns one projection per year of the horizon", () => {
        const result = calculateDcf(reference)!
        expect(result.projections.map((p) => p.year)).toEqual([1, 2, 3, 4, 5])
        expect(result.projections.every((p) => p.presentValue > 0)).toBe(true)
        expect(result.projections[0].presentValue).toBeCloseTo(100, 6)
    })

    it("subtracts net debt from enterprise value", () => {
        const result = calculateDcf({ ...reference, netDebt: 500 })!
        expect(result.equityValue).toBeCloseTo(1000, 6)
        expect(result.fairValuePerShare).toBeCloseTo(10, 6)
        expect(result.verdict).toBe("fairly-valued")
    })

    it("adds a net cash position to enterprise value", () => {
        const result = calculateDcf({ ...reference, netDebt: -300 })!
        expect(result.equityValue).toBeCloseTo(1800, 6)
        expect(result.fairValuePerShare).toBeCloseTo(18, 6)
    })

    it("falls as the discount rate rises", () => {
        const cheap = calculateDcf({
            ...reference,
            assumptions: { ...reference.assumptions, discountRate: 0.08 },
        })!
        const dear = calculateDcf({
            ...reference,
            assumptions: { ...reference.assumptions, discountRate: 0.12 },
        })!
        expect(cheap.fairValuePerShare).toBeGreaterThan(dear.fairValuePerShare)
    })

    it("rises as the growth rate rises", () => {
        const slow = calculateDcf({
            ...reference,
            assumptions: { ...reference.assumptions, growthRate: 0.05 },
        })!
        const fast = calculateDcf({
            ...reference,
            assumptions: { ...reference.assumptions, growthRate: 0.15 },
        })!
        expect(fast.fairValuePerShare).toBeGreaterThan(slow.fairValuePerShare)
    })

    it("returns null instead of throwing on unsolvable assumptions", () => {
        expect(
            calculateDcf({
                ...reference,
                assumptions: { ...reference.assumptions, terminalGrowthRate: 0.12 },
            })
        ).toBeNull()
        expect(calculateDcf({ ...reference, sharesOutstanding: 0 })).toBeNull()
        expect(calculateDcf({ ...reference, currentPrice: 0 })).toBeNull()
    })
})

describe("warnings", () => {
    it("stays quiet on a well-behaved valuation", () => {
        const result = calculateDcf({
            ...reference,
            assumptions: { growthRate: 0.1, discountRate: 0.2, terminalGrowthRate: 0, years: 5 },
        })!
        expect(result.warnings).toEqual([])
    })

    it("flags negative free cash flow", () => {
        const result = calculateDcf({ ...reference, freeCashFlow: -50 })!
        expect(result.warnings).toContain("negative-free-cash-flow")
    })

    it("flags growth that is hard to sustain", () => {
        const result = calculateDcf({
            ...reference,
            assumptions: { ...reference.assumptions, growthRate: 0.3, discountRate: 0.35 },
        })!
        expect(result.warnings).toContain("aggressive-growth")
    })

    it("flags a discount rate close to terminal growth", () => {
        const result = calculateDcf({
            ...reference,
            assumptions: { ...reference.assumptions, discountRate: 0.1, terminalGrowthRate: 0.095 },
        })!
        expect(result.warnings).toContain("narrow-discount-spread")
    })

    it("flags a valuation dominated by the terminal value", () => {
        const result = calculateDcf({
            ...reference,
            assumptions: { ...reference.assumptions, discountRate: 0.1, terminalGrowthRate: 0.09 },
        })!
        expect(result.terminalValueWeight).toBeGreaterThan(0.85)
        expect(result.warnings).toContain("terminal-value-dominant")
    })
})

describe("validateDcfInputs", () => {
    it("passes a sound set of inputs", () => {
        expect(validateDcfInputs(reference)).toEqual([])
    })

    it("rejects a discount rate at or below terminal growth", () => {
        expect(
            validateDcfInputs({
                ...reference,
                assumptions: { ...reference.assumptions, terminalGrowthRate: 0.1 },
            })
        ).toContain("terminal-growth-too-high")
    })

    it("rejects missing share counts and prices", () => {
        expect(validateDcfInputs({ ...reference, sharesOutstanding: 0 })).toContain("invalid-shares")
        expect(validateDcfInputs({ ...reference, currentPrice: -1 })).toContain("invalid-price")
    })

    it("rejects a non-finite cash flow", () => {
        expect(validateDcfInputs({ ...reference, freeCashFlow: NaN })).toContain(
            "invalid-free-cash-flow"
        )
    })

    it("rejects an empty horizon", () => {
        expect(
            validateDcfInputs({
                ...reference,
                assumptions: { ...reference.assumptions, years: 0 },
            })
        ).toContain("invalid-horizon")
    })
})

describe("buildSensitivityMatrix", () => {
    const matrix = buildSensitivityMatrix(reference)

    it("spans growth by four points and the discount rate by two", () => {
        expect(matrix.growthRates).toEqual([0.06, 0.08, 0.1, 0.12, 0.14])
        expect(matrix.discountRates).toEqual([0.08, 0.09, 0.1, 0.11, 0.12])
    })

    it("lays out rows by discount rate and columns by growth rate", () => {
        expect(matrix.rows).toHaveLength(5)
        expect(matrix.rows.every((row) => row.length === 5)).toBe(true)
        expect(matrix.rows[0][0].discountRate).toBe(0.08)
        expect(matrix.rows[0][0].growthRate).toBe(0.06)
    })

    it("marks exactly one cell as the current assumption set", () => {
        const base = matrix.rows.flat().filter((cell) => cell.isBase)
        expect(base).toHaveLength(1)
        expect(base[0].fairValuePerShare).toBeCloseTo(15, 6)
        expect(base[0].growthRate).toBe(0.1)
        expect(base[0].discountRate).toBe(0.1)
    })

    it("moves down each column and up each row", () => {
        const column = matrix.rows.map((row) => row[2].fairValuePerShare!)
        expect(column).toEqual([...column].sort((a, b) => b - a))

        const row = matrix.rows[2].map((cell) => cell.fairValuePerShare!)
        expect(row).toEqual([...row].sort((a, b) => a - b))
    })

    it("reports the extremes for heatmap scaling", () => {
        expect(matrix.minFairValue).toBeCloseTo(matrix.rows[4][0].fairValuePerShare!, 6)
        expect(matrix.maxFairValue).toBeCloseTo(matrix.rows[0][4].fairValuePerShare!, 6)
    })

    it("leaves unsolvable cells null rather than dropping them", () => {
        const unstable = buildSensitivityMatrix({
            ...reference,
            assumptions: {
                ...reference.assumptions,
                discountRate: 0.03,
                terminalGrowthRate: 0.025,
            },
        })

        expect(unstable.rows[0][0].fairValuePerShare).toBeNull()
        expect(unstable.rows[0][0].verdict).toBeNull()
        expect(unstable.rows[4][4].fairValuePerShare).not.toBeNull()
        expect(unstable.rows.flat()).toHaveLength(25)
    })

    it("honours a custom grid size", () => {
        const wide = buildSensitivityMatrix(reference, { steps: 3, growthSpread: 0.06 })
        expect(wide.growthRates).toHaveLength(7)
        expect(wide.discountRates).toHaveLength(7)
        expect(wide.growthRates[0]).toBeCloseTo(0.04, 6)
    })
})

describe("growth benchmarks", () => {
    it("computes a compound annual growth rate", () => {
        expect(cagr(100, 200, 1)).toBeCloseTo(1, 9)
        expect(cagr(100, 121, 2)).toBeCloseTo(0.1, 9)
    })

    it("declines to answer when a company passed through zero", () => {
        expect(cagr(0, 100, 3)).toBeNull()
        expect(cagr(100, -50, 3)).toBeNull()
        expect(cagr(100, 200, 0)).toBeNull()
    })

    it("derives the benchmark from a chronological series", () => {
        expect(historicalGrowthRate([100, 110, 121])).toBeCloseTo(0.1, 9)
        expect(historicalGrowthRate([100])).toBeNull()
        expect(historicalGrowthRate([])).toBeNull()
    })

    it("handles a real four year free cash flow series", () => {
        const nvidiaFcf = [3_808_000_000, 27_021_000_000, 60_853_000_000, 96_676_000_000]
        expect(historicalGrowthRate(nvidiaFcf)).toBeCloseTo(1.9391, 3)
    })

    it("returns a negative benchmark for a shrinking series", () => {
        const appleFcf = [111_443_000_000, 99_584_000_000, 108_807_000_000, 98_767_000_000]
        expect(historicalGrowthRate(appleFcf)).toBeLessThan(0)
    })
})

describe("DEFAULT_DCF_ASSUMPTIONS", () => {
    it("is solvable out of the box", () => {
        expect(
            calculateDcf({ ...reference, assumptions: DEFAULT_DCF_ASSUMPTIONS })
        ).not.toBeNull()
    })
})
