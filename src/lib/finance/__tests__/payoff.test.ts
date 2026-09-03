import { describe, expect, it } from "vitest"

import {
    buildCoveredCall,
    buildPayoffCurve,
    buildSingleOption,
    buildStraddle,
    buildVerticalSpread,
    findBreakEvens,
    maxProfitAndLoss,
    netCost,
    optionLeg,
    payoffAtPrice,
    stockLeg,
} from "../payoff"
import type { OptionLegContract } from "../types"

const call = (strike: number, premium: number): OptionLegContract => ({
    type: "call",
    strike,
    premium,
})

const put = (strike: number, premium: number): OptionLegContract => ({
    type: "put",
    strike,
    premium,
})

describe("long call", () => {
    const legs = [optionLeg("buy", call(100, 5))]

    it("costs the premium times the multiplier", () => {
        expect(netCost(legs)).toBe(500)
    })

    it("loses the full premium below the strike", () => {
        expect(payoffAtPrice(legs, 90)).toBe(-500)
        expect(payoffAtPrice(legs, 100)).toBe(-500)
    })

    it("gains one multiplier per point above the break-even", () => {
        expect(payoffAtPrice(legs, 110)).toBe(500)
        expect(payoffAtPrice(legs, 120)).toBe(1500)
    })

    it("breaks even at strike plus premium", () => {
        expect(findBreakEvens(legs)).toEqual([105])
    })

    it("has unlimited upside and a capped loss", () => {
        expect(maxProfitAndLoss(legs)).toEqual({ maxProfit: null, maxLoss: -500 })
    })
})

describe("short put", () => {
    const legs = [optionLeg("sell", put(100, 4))]

    it("keeps the credit above the strike", () => {
        expect(payoffAtPrice(legs, 110)).toBe(400)
    })

    it("loses below the break-even", () => {
        expect(payoffAtPrice(legs, 90)).toBe(-600)
        expect(findBreakEvens(legs)).toEqual([96])
    })

    it("caps the loss at a zero underlying", () => {
        expect(maxProfitAndLoss(legs)).toEqual({ maxProfit: 400, maxLoss: -9600 })
    })

    it("reports a net credit", () => {
        expect(netCost(legs)).toBe(-400)
    })
})

describe("bull call spread", () => {
    const strategy = buildVerticalSpread(call(100, 5), call(110, 2))

    it("is classified from the relative strikes", () => {
        expect(strategy.type).toBe("bull-call-spread")
        expect(buildVerticalSpread(call(110, 5), call(100, 9)).type).toBe("bear-call-spread")
        expect(buildVerticalSpread(put(100, 2), put(110, 6)).type).toBe("bull-put-spread")
        expect(buildVerticalSpread(put(110, 6), put(100, 2)).type).toBe("bear-put-spread")
    })

    it("pays a net debit of the premium difference", () => {
        expect(netCost(strategy.legs)).toBe(300)
    })

    it("caps profit at the strike width less the debit", () => {
        expect(maxProfitAndLoss(strategy.legs)).toEqual({ maxProfit: 700, maxLoss: -300 })
        expect(payoffAtPrice(strategy.legs, 115)).toBe(700)
    })

    it("breaks even at the long strike plus the debit", () => {
        expect(findBreakEvens(strategy.legs)).toEqual([103])
    })

    it("rejects mismatched option types", () => {
        expect(() => buildVerticalSpread(call(100, 5), put(110, 2))).toThrow()
    })
})

describe("long straddle", () => {
    const strategy = buildStraddle("buy", call(100, 5), put(100, 4))

    it("is classified as a straddle when the strikes match", () => {
        expect(strategy.type).toBe("long-straddle")
        expect(buildStraddle("buy", call(105, 3), put(95, 3)).type).toBe("long-strangle")
    })

    it("costs both premiums", () => {
        expect(netCost(strategy.legs)).toBe(900)
    })

    it("breaks even on either side of the strike", () => {
        expect(findBreakEvens(strategy.legs)).toEqual([91, 109])
    })

    it("loses the most at the strike", () => {
        expect(payoffAtPrice(strategy.legs, 100)).toBe(-900)
        expect(maxProfitAndLoss(strategy.legs)).toEqual({ maxProfit: null, maxLoss: -900 })
    })

    it("profits on a large move in either direction", () => {
        expect(payoffAtPrice(strategy.legs, 120)).toBe(1100)
        expect(payoffAtPrice(strategy.legs, 80)).toBe(1100)
    })
})

describe("covered call", () => {
    const strategy = buildCoveredCall(95, call(105, 3))

    it("combines long stock with a short call", () => {
        expect(strategy.legs).toHaveLength(2)
        expect(strategy.legs[0]).toEqual(stockLeg("buy", 100, 95))
    })

    it("reports the capital outlay net of the credit", () => {
        expect(netCost(strategy.legs)).toBe(9200)
    })

    it("caps profit once the stock is called away", () => {
        expect(payoffAtPrice(strategy.legs, 105)).toBe(1300)
        expect(payoffAtPrice(strategy.legs, 130)).toBe(1300)
        expect(maxProfitAndLoss(strategy.legs)).toEqual({ maxProfit: 1300, maxLoss: -9200 })
    })

    it("breaks even at the entry price less the credit", () => {
        expect(findBreakEvens(strategy.legs)).toEqual([92])
    })
})

describe("buildPayoffCurve", () => {
    const legs = buildVerticalSpread(call(100, 5), call(110, 2)).legs

    it("samples an ascending price grid", () => {
        const curve = buildPayoffCurve(legs, { spot: 100, steps: 25 })
        const prices = curve.points.map((point) => point.price)
        expect(prices).toEqual([...prices].sort((a, b) => a - b))
        expect(curve.points.length).toBeGreaterThanOrEqual(25)
    })

    it("always samples the strikes exactly so kinks are not rounded off", () => {
        const curve = buildPayoffCurve(legs, { spot: 100, steps: 7 })
        const prices = curve.points.map((point) => point.price)
        expect(prices).toContain(100)
        expect(prices).toContain(110)
    })

    it("carries the summary metrics alongside the points", () => {
        const curve = buildPayoffCurve(legs, { spot: 100 })
        expect(curve.netCost).toBe(300)
        expect(curve.breakEvens).toEqual([103])
        expect(curve.maxProfit).toBe(700)
        expect(curve.maxLoss).toBe(-300)
    })

    it("expresses profit as a fraction of the net outlay", () => {
        const curve = buildPayoffCurve(legs, { minPrice: 110, maxPrice: 120, steps: 2 })
        expect(curve.points[0].profitPercent).toBeCloseTo(700 / 300, 6)
    })

    it("honours an explicit price range", () => {
        const curve = buildPayoffCurve(legs, { minPrice: 80, maxPrice: 130, steps: 3 })
        expect(curve.points[0].price).toBe(80)
        expect(curve.points[curve.points.length - 1].price).toBe(130)
    })

    it("handles an empty position without dividing by zero", () => {
        const curve = buildPayoffCurve([])
        expect(curve.netCost).toBe(0)
        expect(curve.breakEvens).toEqual([])
        expect(curve.points.every((point) => point.profitPercent === 0)).toBe(true)
    })
})

describe("buildSingleOption", () => {
    it("classifies each of the four single-leg positions", () => {
        expect(buildSingleOption("buy", call(100, 5)).type).toBe("long-call")
        expect(buildSingleOption("sell", call(100, 5)).type).toBe("short-call")
        expect(buildSingleOption("buy", put(100, 5)).type).toBe("long-put")
        expect(buildSingleOption("sell", put(100, 5)).type).toBe("short-put")
    })

    it("scales with quantity", () => {
        const single = buildSingleOption("buy", call(100, 5), 1)
        const triple = buildSingleOption("buy", call(100, 5), 3)
        expect(payoffAtPrice(triple.legs, 120)).toBe(payoffAtPrice(single.legs, 120) * 3)
    })
})
