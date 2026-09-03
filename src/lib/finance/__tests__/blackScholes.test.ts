import { describe, expect, it } from "vitest"

import {
    blackScholesPrice,
    delta,
    gamma,
    greeks,
    impliedVolatility,
    intrinsicValue,
    normCdf,
    theta,
    vega,
    yearsToExpiry,
} from "../blackScholes"
import type { BlackScholesInputs } from "../types"

/** Textbook reference case: S=100, K=100, T=1y, r=5%, q=0, vol=20%. */
const baseCall: BlackScholesInputs = {
    type: "call",
    spot: 100,
    strike: 100,
    timeToExpiry: 1,
    volatility: 0.2,
    riskFreeRate: 0.05,
    dividendYield: 0,
}

const basePut: BlackScholesInputs = { ...baseCall, type: "put" }

describe("normCdf", () => {
    it("matches known quantiles", () => {
        expect(normCdf(0)).toBeCloseTo(0.5, 6)
        expect(normCdf(1.96)).toBeCloseTo(0.975, 4)
        expect(normCdf(-1.96)).toBeCloseTo(0.025, 4)
    })

    it("is symmetric about zero", () => {
        expect(normCdf(0.73) + normCdf(-0.73)).toBeCloseTo(1, 6)
    })
})

describe("blackScholesPrice", () => {
    it("prices the reference call and put", () => {
        expect(blackScholesPrice(baseCall)).toBeCloseTo(10.4506, 3)
        expect(blackScholesPrice(basePut)).toBeCloseTo(5.5735, 3)
    })

    it("satisfies put-call parity", () => {
        const parity = 100 - 100 * Math.exp(-0.05)
        expect(blackScholesPrice(baseCall) - blackScholesPrice(basePut)).toBeCloseTo(parity, 6)
    })

    it("collapses to intrinsic value at expiry", () => {
        expect(blackScholesPrice({ ...baseCall, spot: 115, timeToExpiry: 0 })).toBe(15)
        expect(blackScholesPrice({ ...basePut, spot: 115, timeToExpiry: 0 })).toBe(0)
    })

    it("collapses to intrinsic value at zero volatility", () => {
        expect(blackScholesPrice({ ...baseCall, spot: 120, volatility: 0 })).toBe(20)
    })

    it("increases with volatility", () => {
        const low = blackScholesPrice({ ...baseCall, volatility: 0.15 })
        const high = blackScholesPrice({ ...baseCall, volatility: 0.45 })
        expect(high).toBeGreaterThan(low)
    })
})

describe("greeks", () => {
    it("matches reference values for the base call", () => {
        expect(delta(baseCall)).toBeCloseTo(0.6368, 4)
        expect(gamma(baseCall)).toBeCloseTo(0.018762, 5)
        expect(vega(baseCall)).toBeCloseTo(0.37524, 5)
        expect(theta(baseCall)).toBeCloseTo(-0.017573, 5)
    })

    it("relates call and put delta through parity", () => {
        expect(delta(baseCall) - delta(basePut)).toBeCloseTo(1, 6)
    })

    it("shares gamma and vega between calls and puts", () => {
        expect(gamma(baseCall)).toBeCloseTo(gamma(basePut), 9)
        expect(vega(baseCall)).toBeCloseTo(vega(basePut), 9)
    })

    it("returns a full set of scaled greeks", () => {
        const result = greeks(baseCall)
        expect(Object.keys(result).sort()).toEqual(["delta", "gamma", "rho", "theta", "vega"])
        expect(result.rho).toBeGreaterThan(0)
    })

    it("zeroes second-order greeks at expiry", () => {
        const expired = { ...baseCall, timeToExpiry: 0 }
        expect(gamma(expired)).toBe(0)
        expect(vega(expired)).toBe(0)
        expect(delta({ ...expired, spot: 120 })).toBe(1)
        expect(delta({ ...expired, spot: 80 })).toBe(0)
    })
})

describe("impliedVolatility", () => {
    it("recovers the volatility used to price a call", () => {
        const price = blackScholesPrice({ ...baseCall, volatility: 0.35 })
        expect(impliedVolatility(price, baseCall)).toBeCloseTo(0.35, 4)
    })

    it("recovers the volatility used to price a put", () => {
        const price = blackScholesPrice({ ...basePut, volatility: 0.18 })
        expect(impliedVolatility(price, basePut)).toBeCloseTo(0.18, 4)
    })

    it("handles a far out-of-the-money contract where vega is small", () => {
        const otm = { ...baseCall, strike: 180 }
        const price = blackScholesPrice({ ...otm, volatility: 0.6 })
        expect(impliedVolatility(price, otm)).toBeCloseTo(0.6, 3)
    })

    it("returns null for prices outside the no-arbitrage bounds", () => {
        expect(impliedVolatility(0, baseCall)).toBeNull()
        expect(impliedVolatility(1_000, baseCall)).toBeNull()
    })
})

describe("intrinsicValue", () => {
    it("never goes negative", () => {
        expect(intrinsicValue("call", 90, 100)).toBe(0)
        expect(intrinsicValue("put", 110, 100)).toBe(0)
        expect(intrinsicValue("call", 110, 100)).toBe(10)
        expect(intrinsicValue("put", 90, 100)).toBe(10)
    })
})

describe("yearsToExpiry", () => {
    it("converts a future date into a year fraction", () => {
        const from = new Date("2026-01-01T00:00:00Z")
        expect(yearsToExpiry("2027-01-01T00:00:00Z", from)).toBeCloseTo(1, 6)
    })

    it("floors expired contracts at zero", () => {
        const from = new Date("2026-01-01T00:00:00Z")
        expect(yearsToExpiry("2025-01-01T00:00:00Z", from)).toBe(0)
    })
})
